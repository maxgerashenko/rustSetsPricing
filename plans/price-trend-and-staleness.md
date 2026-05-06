# Plan: 24h Price Trend & Stale Price Indicator

## Goal
Show users two pieces of price freshness/movement info per item row:
1. **24h trend delta** — `▲` green / `▼` red with percentage change vs the price recorded ~24h ago.
2. **Stale price indicator** — visual cue when the cached price is approaching its TTL expiry, signaling the displayed value may be out of date.

## Current state

- Prices live in `items` table at [server/db.js:14-19](../server/db.js#L14-L19): `name PK, price TEXT, hash, price_expires_at TIMESTAMPTZ`. Only the **current** price is stored — no history.
- TTL is 4h (`PRICE_TTL_MS` at [server/index.js:22](../server/index.js#L22)). Server returns cached price as long as `price_expires_at > now()`. After expiry, refetched from Steam.
- `GET /api/item` response shape ([server/index.js:106](../server/index.js#L106)): `{ price, hash, url }`. No timestamp, no trend.
- Frontend item row consumes only `{ price, url }` ([src/views/list_view/list_view.jsx:35-37](../src/views/list_view/list_view.jsx#L35-L37), then via `ItemsList` → row component).

Two missing capabilities: (a) a price-history table to compute deltas, (b) timestamp/expiry exposure for staleness UI.

## Steps

### 1. Schema — `item_price_history`
New table in [server/db.js](../server/db.js):

```sql
CREATE TABLE IF NOT EXISTS item_price_history (
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (name, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_iph_name_time
  ON item_price_history (name, recorded_at DESC);
```

Append-only: every successful Steam price fetch writes a row. No update/delete in normal flow.

### 2. Record history on price fetch
In `GET /api/item` at [server/index.js:144-150](../server/index.js#L144-L150), after the `INSERT INTO items ... ON CONFLICT DO UPDATE`, if `price` was newly fetched (i.e. `priceValid == false` and `priceResult.status === 'fulfilled'` with a non-null value), insert a history row:

```js
if (priceValid == false && price != null) {
  pool.query(
    'INSERT INTO item_price_history (name, price) VALUES ($1, $2)',
    [name, price]
  ).catch(err => console.error('[Item] history insert failed:', err.message))
}
```

Fire-and-forget; never block the response.

### 3. Compute 24h trend on read
Extend `GET /api/item` to also look up the price closest to (but no older than) 24h ago. One extra query, run in parallel with the existing cached lookup:

```js
const { rows: histRows } = await pool.query(
  `SELECT price, recorded_at FROM item_price_history
   WHERE name = $1 AND recorded_at <= NOW() - INTERVAL '24 hours'
   ORDER BY recorded_at DESC
   LIMIT 1`,
  [name]
)
const baseline = histRows[0]?.price ?? null
```

Compute delta server-side:
- Parse `"$1.23"` → cents (helper: strip non-digits except `.`, `parseFloat`, ×100, round).
- `deltaCents = currentCents - baselineCents` (signed integer, exact).
- `pct = deltaCents / baselineCents` (fraction); null if no baseline or parse failed.

Return shape extended (additive):

```js
{ price, hash, url,
  priceUpdatedAt: cached.price_updated_at /* see step 4 */,
  priceExpiresAt: cached.price_expires_at,
  trend: {
    direction: 'up'|'down'|'flat',
    pct: 0.042,           // fractional change, e.g. +4.2%
    deltaCents: 5,        // signed exact delta in cents (currency-agnostic — Steam returns USD by default)
    baseline: '$1.10',    // raw baseline string for tooltip
    baselineAt: '2026-05-05T14:00:00Z'  // recorded_at of the baseline row
  } | null }
```

Both `deltaCents` (exact) and `pct` (relative) are returned so the client can render either or both.

### 4. Expose freshness — add `price_updated_at`
Add a `price_updated_at TIMESTAMPTZ` column to `items` (mirrors history insert time). Fill on the same `INSERT ... DO UPDATE` path:

```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;
```

Set in the upsert when a fresh price is written. `price_expires_at` already exists; the pair `(updatedAt, expiresAt)` lets the client classify the price as fresh / aging / stale.

### 5. Frontend — trend chip per row
In the row component (likely `src/views/list_view/items_list.jsx` or its child — verify before editing):
- If `trend != null`, render a small chip next to the price showing **both** absolute and relative change:
  - `▲ +$0.05 (4.2%)` with `color: var(--success)` for `direction === 'up'`
  - `▼ −$0.05 (4.2%)` with `color: var(--danger)` for `direction === 'down'`
  - hide chip for `direction === 'flat'` (or render muted `· $0.00`)
- Format `deltaCents` back to currency string (e.g. cents → `"$0.05"`); sign rendered via the arrow + `+`/`−` prefix.
- Tooltip / `title` attribute: `"vs ${baseline} on ${baselineAt}"`.
- If horizontal space is tight, show `▲ 4.2%` and move the absolute amount to the tooltip — but default is to show both inline.

### 6. Frontend — stale indicator
Compute a freshness state from `priceExpiresAt`:
- `now < expiresAt - 30min` → fresh (no indicator)
- `now >= expiresAt - 30min && now < expiresAt` → **aging**: faint dot or muted clock icon next to price
- `now >= expiresAt` → **stale**: visible warning icon, tooltip `"Price last updated ${relative time}"`

Single threshold constant on the client (e.g. `STALE_WINDOW_MS = 30 * 60 * 1000`). No need to recompute on a timer for short-lived sessions; compute once on render. If users keep the tab open for hours, optional `setInterval` every minute to re-evaluate — defer unless requested.

### 7. Manual test
- Fresh DB → item fetched once → row shows price, no trend chip (no baseline yet).
- Manually insert `item_price_history` row for an item with `recorded_at = NOW() - INTERVAL '25 hours'` and a different price → next `/api/item` response includes `trend`, row renders chip.
- Wait until `now > price_expires_at - 30min` → row shows aging dot. After expiry → stale icon. After next successful fetch → indicator clears.
- Verify history row count grows by 1 per fresh fetch (not on cache hits).

## Out of scope
- Sparkline / mini chart per row (only single-point delta for now).
- Configurable trend window (24h hardcoded).
- Backfill of history for items that already exist in `items` (history starts empty; deltas appear after 24h of operation).
- Server-side aggregation/cleanup of old history rows.
- Surfacing trend on the sets-list preview rows.
- Push-style refresh of stale prices in an open tab.

## Recommended model
Sonnet — touches schema, backend response shape, and frontend row rendering across multiple files; small but cross-cutting.
