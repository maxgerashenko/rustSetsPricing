# Plan: Per-Item 24h Trend + Stale Indicator (Lazy)

## Goal
Per-item row info:
1. **24h trend delta** — `▲` green / `▼` red with % change vs the price ~24h ago.
2. **Stale indicator** — visual cue when the cached price is near or past its TTL.

…without writing history on every Steam fetch and without any background refresh.

Hard rules (shared with [set-cached-total.md](set-cached-total.md)):
- **Lazy only.** A Steam call happens iff (a) the item is requested by the UI for an open set, **and** (b) `price_expires_at <= now()` for that name. No batch warmups.
- **Cross-set reuse is automatic.** `items` is keyed by `name`; a fetch for set A is reused by set B with no new request. This plan codifies and logs that.
- **Trend baselines come from set events**, not from a fetch-history table. Snapshots are written only when a set is saved or its total is recomputed — both paths reuse already-cached prices, so snapshotting itself fires zero Steam calls.

## Current state

- `items (name PK, price, hash, price_expires_at)` at [server/db.js:14-19](../server/db.js#L14-L19). 4h TTL ([server/index.js:22](../server/index.js#L22)).
- `GET /api/item` ([server/index.js:90-161](../server/index.js#L90-L161)) is already lazy: cache-hit returns immediately; on miss it calls `fetchPrice` (rate-limited, 600ms gap, 1min cooldown after 3 fails). Response shape today: `{ price, hash, url }` — no timestamp, no trend.
- Frontend item row consumes only `{ price, url }` ([src/views/list_view/list_view.jsx:35-37](../src/views/list_view/list_view.jsx#L35-L37) → `ItemsList` → row).

Two missing capabilities: (a) a snapshot source for trend math; (b) timestamp/expiry exposure for staleness UI.

## Steps

### 1. Schema — `item_price_snapshots`

```sql
CREATE TABLE IF NOT EXISTS item_price_snapshots (
  name TEXT NOT NULL,
  price_cents BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,  -- 'set_save' | 'set_recompute'
  PRIMARY KEY (name, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_ips_name_time
  ON item_price_snapshots (name, recorded_at DESC);
```

`source` is for debugging; not exposed to the client.

Shared currency helper in `server/utils.js` (also used by the set plan):
```js
const priceToCents = str => {
  if (str == null) return null
  const cleaned = String(str).replace(/[^\d.]/g, '')
  return cleaned === '' ? null : Math.round(Number.parseFloat(cleaned) * 100)
}
```

### 2. One snapshot writer — set events only

`recordSnapshots(priceByName, source)` in `server/index.js`:

```js
async function recordSnapshots(priceByName, source) {
  const rows = Object.entries(priceByName)
    .map(([name, raw]) => [name, priceToCents(raw)])
    .filter(([, cents]) => cents != null)
  if (rows.length === 0) return
  const values = rows.map((_, i) => `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(',')
  const params = rows.flatMap(([name, cents]) => [name, cents, source])
  pool.query(
    `INSERT INTO item_price_snapshots (name, price_cents, source) VALUES ${values}`,
    params
  ).catch(err => console.error('[Snapshots] insert failed:', err.message))
}
```

Called from exactly two places:
1. `POST /api/sets` (set-save) — after the set row is inserted, read prices already cached for its items in one query and snapshot. No Steam call.
2. The `recomputeSetTotal` path from [set-cached-total.md](set-cached-total.md) — snapshot the prices that participated in the new total (already in memory there).

`GET /api/item` **does not** write snapshots. Keeps writers low; avoids row spam from incidental refetches.

### 3. Expose freshness — augment `GET /api/item` response

Always return `priceUpdatedAt` (= `price_expires_at - PRICE_TTL_MS`, derivable without a new column) and `priceExpiresAt`. The pair lets the client classify fresh / aging / stale.

Optional: add `price_updated_at TIMESTAMPTZ` to `items` and write it on the upsert path — cleaner than deriving. Pick whichever is less code; behavior is the same.

Also add structured logging: `[Item] cache hit name=… ttl_remaining=…s` vs `[Item] miss → steam name=…` so cross-set reuse is auditable.

### 4. Compute 24h trend on read

One extra query in `GET /api/item`, parallel to the cache lookup:

```sql
SELECT price_cents, recorded_at FROM item_price_snapshots
WHERE name = $1 AND recorded_at <= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC
LIMIT 1
```

Compute `deltaCents = currentCents - baselineCents`, `pct = deltaCents / baselineCents`, `direction ∈ {up, down, flat}`. Null trend if no baseline.

Response shape (additive):
```js
{ price, hash, url,
  priceUpdatedAt, priceExpiresAt,
  trend: { direction, pct, deltaCents, baselineCents, baselineAt } | null }
```

### 5. Frontend — trend chip per row

In the row component (likely `src/views/list_view/items_list.jsx` or its child):
- If `trend != null && direction !== 'flat'`: render `▲ +$0.05 (4.2%)` (success) or `▼ −$0.05 (4.2%)` (danger).
- Format `deltaCents` → `"$0.05"`; sign via the arrow + `+`/`−` prefix.
- Tooltip: `"vs $X.XX on <date>"`.
- Tight horizontal space → show `▲ 4.2%` and move the dollar amount to the tooltip; default shows both inline.
- Reuse the same chip component for the set total in [set-cached-total.md](set-cached-total.md).

### 6. Frontend — stale indicator

Compute freshness from `priceExpiresAt`:
- `now < expiresAt - 30min` → fresh, no indicator.
- within 30min of expiry → faint dot or muted clock icon next to price.
- `now >= expiresAt` → visible warning icon, tooltip `"last updated <relative time>"`.

Single threshold `STALE_WINDOW_MS = 30 * 60 * 1000`. Compute once on render; no timer for short-lived sessions. (Optional: re-evaluate every minute via `setInterval` if users keep tabs open for hours — defer.)

The next user action that loads the row triggers a lazy refresh through `/api/item` and the icon clears. No client-side polling.

### 7. Snapshot housekeeping

Append-only; PK `(name, recorded_at)` blocks dupes. Bound growth by pruning >30 days during `recomputeSetTotal` (name-scoped, one query):

```sql
DELETE FROM item_price_snapshots
WHERE name = ANY($1) AND recorded_at < NOW() - INTERVAL '30 days'
```

Trend window is 24h; 30 days leaves room to widen later without a migration.

### 8. Manual test

1. Fresh DB. Save set A with 3 items → 3 snapshot rows with `source='set_save'`. Zero `/api/item` calls fired by the save path itself.
2. Open set A → frontend calls `/api/item` per row. First open: misses → Steam fetches. Reopen within 4h: only `cache hit` log lines.
3. Save set B sharing 2 items with A → snapshots reuse cached prices; no Steam calls. `items` row count for shared names unchanged.
4. `UPDATE item_price_snapshots SET recorded_at = NOW() - INTERVAL '25 hours', price_cents = <other> WHERE name = '<X>'` → reopen set A, row X renders trend chip; others render none.
5. `UPDATE items SET price_expires_at = NOW() - INTERVAL '1 hour' WHERE name = '<X>'` → reopen set A, row X shows stale icon, then refreshes via lazy `/api/item` and the icon clears. Item Y (still fresh) makes no Steam call.

## Out of scope

- Background warmup or pre-fetch loops.
- Snapshots from `/api/item` cache misses (deliberately omitted — set events are the only writer).
- Currency conversion. Steam returns USD; cents are USD cents.
- Sparkline / multi-point chart per row.
- Configurable trend window (24h hardcoded).
- Backfill for items predating this plan (trend appears 24h after the first set event mentions them).
- Per-user history.

## Relationship to other plans
- **Pairs with** [set-cached-total.md](set-cached-total.md). Both share `priceToCents`, the snapshot writer, and the trend-chip component. Set-recompute writes both `set_total_history` and per-item `item_price_snapshots` in the same path.

## Recommended model
Sonnet — schema + one helper + endpoint shape change + small frontend chip + freshness UI; cross-cutting but not deep.
