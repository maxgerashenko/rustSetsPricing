# Plan: Set Total Price — Lazy Cache + 24h Trend

## Goal
A per-set total price with a 24h trend indicator (▲/▼ %), computed without firing speculative price requests. Browse views never fetch; only opening an individual set may, and only when its cached total is stale.

Hard rules (shared with [price-trend-and-staleness.md](price-trend-and-staleness.md)):
- **Lazy only.** A Steam call is allowed iff (a) an item is needed for an open set, **and** (b) `price_expires_at <= now()` for that name. No batch warmups, no background refresh.
- **No price requests** on the sets-list view or the recent-sets list. Those views read whatever total is already cached on the set row.
- The total is recomputed **only when an individual set is opened** (`GET /api/sets/:hash`) and only if `total_updated_at` is older than 24h.
- Cross-set cache reuse is automatic (`items` is name-keyed); recompute reads `items` directly, never bypassing the cache.

## Current state

- `items_sets` ([server/db.js:24-29](../server/db.js#L24-L29)) stores `set_hash, items (TEXT[]), created_at, last_loaded_at`. No total column.
- `GET /api/sets` ([server/index.js:165-204](../server/index.js#L165-L204)) currently joins each set's items against `items` for `price` and the frontend sums client-side per row → this triggers per-row work for browse views and must be replaced with a cached column read.
- Per-item prices live in `items.price` with `price_expires_at` 4h TTL. Steam is hit on cache miss in `GET /api/item` ([server/index.js:90-161](../server/index.js#L90-L161)) — already lazy and rate-limited.
- No history table for sets or items. The companion item-level plan ([price-trend-and-staleness.md](price-trend-and-staleness.md)) introduces `item_price_snapshots` that this plan writes to as a side effect of recompute.

## Steps

### 1. Schema — total on the set + history

```sql
ALTER TABLE items_sets
  ADD COLUMN IF NOT EXISTS total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS total_currency TEXT,
  ADD COLUMN IF NOT EXISTS total_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_missing INT;  -- # items with null price at compute time

CREATE TABLE IF NOT EXISTS set_total_history (
  set_hash TEXT NOT NULL,
  total_cents BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (set_hash, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_sth_set_time
  ON set_total_history (set_hash, recorded_at DESC);
```

`total_cents` as integer cents avoids float drift. `total_missing` lets the UI show `≥ $X` when some items had no price.

Currency parser helper in `server/utils.js` (shared with the item plan):
```js
const priceToCents = str => {
  if (str == null) return null
  const cleaned = String(str).replace(/[^\d.]/g, '')
  return cleaned === '' ? null : Math.round(Number.parseFloat(cleaned) * 100)
}
```

### 2. Single recompute path — only on individual set open

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
2. For any item where `price IS NULL` **or** `price_expires_at <= NOW()` → call the existing item-fetch path (refactor the body of `GET /api/item` into an internal `fetchItemPrice(name)` helper so this loop and the route share code). Throttle: at most 2–3 concurrent.
3. Sum to `total_cents` via `priceToCents`. Track `missing` for nulls that stayed null.
4. `UPDATE items_sets SET total_cents=$1, total_currency=$2, total_updated_at=NOW(), total_missing=$3 WHERE set_hash=$4`.
5. `INSERT INTO set_total_history (set_hash, total_cents) VALUES ($1, $2)` — fire-and-forget.
6. Call `recordSnapshots(priceByName, 'set_recompute')` from the item plan — same prices, no extra fetch.

This is the **only** place in the codebase that may trigger Steam fetches as a side effect of a set view. List endpoints below must not call it.

### 3. Read paths must not trigger fetches

- `GET /api/sets` ([server/index.js:165](../server/index.js#L165)): drop the per-set item join. Return `{ hash, createdAt, total_cents, total_currency, total_updated_at, total_missing, item_count, preview_items }` — `preview_items` is a small slice (≤ 4) of `{ hash, url }` pulled from already-cached `items` rows, used by the recent-sets thumbnails. No price reads beyond the cached set row + thumbnail hashes. Frontend list/recent views render `total_cents` verbatim or `—` if `total_updated_at IS NULL`.
- Recent-sets endpoint (the `?limit=` form feeding [recent-sets-on-input.md](recent-sets-on-input.md)): same.
- `GET /api/sets/:hash` returns the (possibly just-refreshed) total alongside `trend` (next step).

### 4. 24h trend on the set total

In `GET /api/sets/:hash`, after the freshness check:

```sql
SELECT total_cents, recorded_at FROM set_total_history
WHERE set_hash = $1 AND recorded_at <= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC LIMIT 1
```

Compute `deltaCents`, `pct`, `direction ∈ {up, down, flat}`. Return shape (additive):
```js
{ set_hash, items: [...names],
  total: { cents, currency, updatedAt, missing },
  trend: { direction, pct, deltaCents, baselineCents, baselineAt } | null }
```

### 5. Frontend

- **Sets list / recent-sets row**: render `total_cents` formatted, or `—` when null. Zero fetches, zero spinners. If `total_missing > 0`, prefix with `≥`.
- **Individual set view (list_view)**: show total + trend chip (`▲ +$0.42 (3.1%)` / `▼ −…`) using the shared chip from the item plan.
- Per-item rows continue using the existing `/api/item` lazy path; behavior governed by [price-trend-and-staleness.md](price-trend-and-staleness.md).

### 6. Backfill / first-run
- Existing sets have `total_updated_at = NULL` → list views show `—` until each set is opened once. Acceptable; no batch warmup (would defeat the rule).
- Trend appears only after 24h of operation per set.

### 7. Manual test
1. Fresh DB, create set A with 3 items. Sets list shows `—` for total. **No `/api/item` calls fired** (verify in network tab + server log).
2. Open set A → server fetches missing item prices, writes `total_cents`, history row inserted, item snapshots written. Sets list now shows the total without re-fetching.
3. Reopen set A within 24h → no Steam calls; cached total served.
4. `UPDATE items_sets SET total_updated_at = NOW() - INTERVAL '25 hours'` and insert a 25h-old history row with a different total → reopen recomputes and renders the trend chip.
5. Recent-sets view: scroll/refresh, confirm zero `/api/item` requests.

## Out of scope
- Currency conversion (Steam returns USD; `total_currency` stored but not converted).
- Sparkline of set total over time.
- Background warmup job for stale sets.
- Per-item trend (covered by [price-trend-and-staleness.md](price-trend-and-staleness.md)).
- History pruning for `set_total_history` (low-volume; defer).

## Recommended model
Sonnet — schema + one helper + two endpoint changes + small frontend chip; cross-cutting but not deep.
