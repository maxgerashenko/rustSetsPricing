# Plan: Set Total Price — Cache + 24h Trend

## Goal
Show a per-set total price with a 24h trend indicator (▲/▼ %), without firing per-item price requests when the user is browsing.

Hard rules:
- **No price requests** on the sets-list view or the recent-sets list. Those views read whatever total is already cached on the set row.
- The total is recomputed **only when an individual set is loaded** (`GET /api/sets/:hash` in list view), and only if the cached total is older than 24h.
- Reuse the existing per-item cache; do not bypass it.

## Current state

- `items_sets` ([server/db.js:24-29](../server/db.js#L24-L29)) stores `set_hash, items (TEXT[]), created_at`. No total column.
- `GET /api/sets` ([server/index.js:165-204](../server/index.js#L165-L204)) already joins each set's items against the `items` table for `price`. The frontend currently sums client-side per row → this is the path that must stop triggering work, but reads of the cached column stay.
- Per-item prices live in `items.price` with `price_expires_at` 4h TTL. Steam is hit on cache miss in `GET /api/item` ([server/index.js:106](../server/index.js#L106)).
- No history table for sets. (Item-level history is its own plan in [price-trend-and-staleness.md](price-trend-and-staleness.md) — independent.)

## Steps

### 1. Schema — total + history on the set
Add to `items_sets` and create a small history table ([server/db.js](../server/db.js)):

```sql
ALTER TABLE items_sets
  ADD COLUMN IF NOT EXISTS total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS total_currency TEXT,
  ADD COLUMN IF NOT EXISTS total_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_missing INT;  -- # items with null price at time of compute

CREATE TABLE IF NOT EXISTS set_total_history (
  set_hash TEXT NOT NULL,
  total_cents BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (set_hash, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_sth_set_time
  ON set_total_history (set_hash, recorded_at DESC);
```

`total_cents` as integer cents avoids float drift; `total_missing` lets the UI show "≥ $X" when some items had no price.

### 2. Single recompute path — only on individual set load
In `GET /api/sets/:hash` ([server/index.js:227](../server/index.js#L227)), after resolving `itemNames`:

```js
const STALE_MS = 24 * 60 * 60 * 1000
const fresh = setData.total_updated_at
  && (Date.now() - new Date(setData.total_updated_at).getTime() < STALE_MS)

if (fresh == false) {
  await recomputeSetTotal(setData.set_hash, itemNames)
  // re-read row to get fresh total + trend baseline
}
```

`recomputeSetTotal(setHash, itemNames)`:
1. `SELECT name, price, price_expires_at FROM items WHERE name = ANY($1)`.
2. For any item where `price IS NULL` **or** `price_expires_at <= NOW()` → call the existing item-fetch path (refactor the body of `GET /api/item` into an internal `fetchItemPrice(name)` helper so this loop and the route share code). Throttle: at most N concurrent (reuse existing limiter if present; else `p-limit`-style 2–3).
3. Sum to `total_cents` (parse helper: strip non-digits, ×100, round). Track `missing` count for nulls that stayed null.
4. `UPDATE items_sets SET total_cents=$1, total_currency=$2, total_updated_at=NOW(), total_missing=$3 WHERE set_hash=$4`.
5. `INSERT INTO set_total_history (set_hash, total_cents) VALUES ($1, $2)` — fire-and-forget.

This is the **only** place in the codebase that may trigger Steam fetches as a side effect of a set view. List endpoints below must not call it.

### 3. Read paths must not trigger fetches
- `GET /api/sets` ([server/index.js:165](../server/index.js#L165)): drop the per-set item join. Return only `{ hash, createdAt, total_cents, total_currency, total_updated_at, total_missing, item_count }`. No `items` array, no price reads beyond the set row itself. Frontend list/recent views render the cached total verbatim or "—" if `total_updated_at IS NULL`.
- Recent-sets endpoint (whatever feeds [recent-sets-on-input.md](recent-sets-on-input.md)): same — read only the cached columns.
- `GET /api/sets/:hash` returns the (possibly just-refreshed) total alongside `trend` (next step).

### 4. 24h trend on the set
In `GET /api/sets/:hash`, after the freshness check, look up the baseline:

```sql
SELECT total_cents, recorded_at FROM set_total_history
WHERE set_hash = $1 AND recorded_at <= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC LIMIT 1
```

Compute:
- `deltaCents = current - baseline`
- `pct = deltaCents / baseline` (null if no baseline)
- `direction = 'up' | 'down' | 'flat'`

Return shape (additive):
```js
{ set_hash, items: [...names],
  total: { cents, currency, updatedAt, missing },
  trend: { direction, pct, deltaCents, baselineCents, baselineAt } | null }
```

### 5. Frontend
- **Sets list / recent-sets row**: show `total_cents` formatted, or `—` when null. No fetch, no spinner. If `total_missing > 0`, prefix with `≥`.
- **Individual set view (list_view)**: render total + trend chip (`▲ +$0.42 (3.1%)` / `▼ −…`) using the same chip style proposed in [price-trend-and-staleness.md](price-trend-and-staleness.md) — share the formatter.
- Per-item rows in list view continue to use the existing item endpoint; no behavior change there.

### 6. Backfill / first-run
- Existing sets have `total_updated_at = NULL` → list views show `—` until each set is opened once. Acceptable; no batch warmup (would defeat the "minimize requests" rule).
- Trend appears only after 24h of operation per set. Document this.

### 7. Manual test
1. Fresh DB, create set A with 3 items. Sets list shows `—` for total. **No `/api/item` calls fired** (verify in network tab + server log).
2. Open set A in list view → server fetches missing item prices, writes `total_cents`, history row inserted. Sets list now shows the total without re-fetching.
3. Reopen set A within 24h → no Steam calls; cached total served. (Confirm via server log.)
4. Manually `UPDATE items_sets SET total_updated_at = NOW() - INTERVAL '25 hours'` and insert a history row 25h old with a different total → reopening recomputes and renders the trend chip.
5. Recent-sets view: scroll/refresh, confirm zero `/api/item` requests.

## Out of scope
- Currency conversion (Steam returns USD; `total_currency` is stored but not converted).
- Sparkline of set total over time.
- Background warmup job for stale sets.
- Trend on the per-item rows (covered by [price-trend-and-staleness.md](price-trend-and-staleness.md)).
- History pruning.

## Recommended model
Sonnet — schema + one new server helper + two endpoint changes + small frontend chip; cross-cutting but not deep.
