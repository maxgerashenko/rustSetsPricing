# Plan: Last-Loaded Timestamp on Sets

## Goal
Track the last time each saved set was "loaded" so a future "Recent Sets" view on the main menu can rank sets by recency. A load happens when a user opens a saved set OR when they manually re-enter the exact same items as an existing set.

## Current state

- Schema: [server/db.js:24-29](../server/db.js#L24-L29) — `items_sets` has `created_at` only.
- POST `/api/sets` at [server/index.js:206-225](../server/index.js#L206-L225) computes a deterministic `set_hash` from sorted item hashes and inserts with `ON CONFLICT (set_hash) DO NOTHING`. So a manual re-entry of identical items already collides on the same row — it just doesn't record anything.
- GET `/api/sets/:hash` at [server/index.js:227-251](../server/index.js#L227-L251) reads the row but does not write.
- GET `/api/sets` at [server/index.js:165-204](../server/index.js#L165-L204) lists all sets ordered by `created_at DESC` — this is the ordering we'll later swap to `last_loaded_at`.
- Frontend triggers:
  - Open saved set: [src/app.jsx:28](../src/app.jsx#L28) `fetch('/api/sets/:hash')`
  - Manual paste flow: [src/views/list_view/list_view.jsx:50](../src/views/list_view/list_view.jsx#L50) `POST /api/sets`

## Steps

### 1. Schema migration
In [server/db.js](../server/db.js), add `last_loaded_at TIMESTAMPTZ` to `items_sets` and an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so existing deployments pick it up.

```sql
CREATE TABLE IF NOT EXISTS items_sets (
  id SERIAL PRIMARY KEY,
  set_hash TEXT NOT NULL UNIQUE,
  items TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_loaded_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE items_sets ADD COLUMN IF NOT EXISTS last_loaded_at TIMESTAMPTZ DEFAULT NOW();
```

Backfill on first run is handled by the `DEFAULT NOW()` for the ALTER (existing rows will get the migration time, which is fine — they'll be re-bumped on next load).

### 2. Bump on GET `/api/sets/:hash`
In [server/index.js:229](../server/index.js#L229), after confirming the row exists, fire-and-forget an update. Don't block the response:

```js
pool.query('UPDATE items_sets SET last_loaded_at = NOW() WHERE set_hash = $1', [req.params.hash])
  .catch(err => console.error('[Sets] last_loaded_at bump failed:', err.message))
```

### 3. Bump on POST `/api/sets` (manual re-entry path)
The deterministic hash means manual re-entry of the same items hits the same `set_hash`. Change the insert at [server/index.js:219-222](../server/index.js#L219-L222) to bump `last_loaded_at` on conflict:

```js
await pool.query(
  `INSERT INTO items_sets (set_hash, items)
   VALUES ($1, $2)
   ON CONFLICT (set_hash) DO UPDATE SET last_loaded_at = NOW()`,
  [setHash, sorted]
)
```

This covers both first-creation (creates row, `last_loaded_at` gets the column default) and manual re-entry (bumps timestamp).

### 4. (Optional, low risk) Expose in GET `/api/sets`
Add `last_loaded_at` to the SELECT at [server/index.js:167-169](../server/index.js#L167-L169) and include it in the returned object, so the future "Recent Sets" view can render it without another schema change.

```js
'SELECT set_hash, items, created_at, last_loaded_at FROM items_sets ORDER BY last_loaded_at DESC NULLS LAST'
```

Keep the response shape additive: `{ hash, items, createdAt, lastLoadedAt }`.

### 5. Manual test
- Create new set via paste → row has `created_at == last_loaded_at`.
- Open that set via `/list?set=<hash>` → `last_loaded_at` advances, `created_at` unchanged.
- Paste the same items again from the input view → `last_loaded_at` advances again, no duplicate row.
- Paste a *different* item list that happens to dedupe to the same hash (same set, different order) → still bumps the same row (sorted hashes guarantee this).
- Verify in psql: `SELECT set_hash, created_at, last_loaded_at FROM items_sets ORDER BY last_loaded_at DESC;`

## Out of scope
- Main-menu "Recent Sets" view — this plan only ensures the timestamp is recorded and exposed.
- Per-user load history (no user model yet; timestamp is global per set).
- Decay/archival of stale sets.
- Distinguishing "viewed" vs "edited" loads — both bump the same field for now.

## Recommended model
Haiku — small, well-scoped backend change (one schema column, two query tweaks).
