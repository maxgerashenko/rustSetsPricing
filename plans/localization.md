# Plan — Always source item names from `loc_<lang>` (default `loc_eng`)

## Goal
- Keep `items.name` column as-is (no schema change).
- API responses always derive the displayed name from `loc_<lang>` based on `?loc=` query param, defaulting to `loc_eng` when omitted.
- Structure code so adding a new locale is just inserting rows into `loc_<lang>` — no route changes needed.

## Current state (refs)
- Schema: [server/db.js:14-23](server/db.js#L14-L23) — `items(name PK, price, hash, price_expires_at)`, `loc_eng(hash PK, name)`. Unchanged.
- `GET /api/item?name=` returns `{ price, hash, url }` from `items` ([server/index.js:90-161](server/index.js#L90-L161)) — name comes back implicitly via the request.
- `GET /api/sets` joins items by `name` from `loc_eng` already, but hard-codes `loc_eng` ([server/index.js:171-197](server/index.js#L171-L197)).
- `GET /api/sets/:hash` already accepts `?loc=` defaulting to `eng` ([server/index.js:227-251](server/index.js#L227-L251)) — keep as the model.
- Frontend callers: [src/views/list_view/list_view.jsx:11](src/views/list_view/list_view.jsx#L11), [src/views/sets_list/sets_list.jsx:14](src/views/sets_list/sets_list.jsx#L14), [src/app.jsx:28](src/app.jsx#L28).

## Changes

### 1. Helper — `resolveLocTable(req)` ([server/index.js](server/index.js))
Top-level helper used by every route that returns names:
- Reads `req.query.loc`, validates against `/^[a-z]{2,5}$/`.
- Returns the table name (e.g. `loc_rus`); falls back to `loc_eng` for missing/invalid input.
- Strict regex prevents SQL injection on the interpolated identifier.

### 2. `GET /api/item` ([server/index.js:90-161](server/index.js#L90-L161))
- Behavior unchanged for the input side: still keyed by `?name=` (English name from the user's paste).
- After resolving price + hash, look up the localized name from `resolveLocTable(req)` by `hash`, falling back to the English request `name` if the locale row is missing.
- Response body extended to include `name`: `{ name, price, hash, url }`. (English request still returns the same string the client sent — no behavior change for current callers.)
- Continue inserting into `loc_eng (hash, name)` on first resolution as today ([server/index.js:152-157](server/index.js#L152-L157)).

### 3. `GET /api/sets` ([server/index.js:165-204](server/index.js#L165-L204))
- Replace the hard-coded `loc_eng` query with `resolveLocTable(req)`.
- Two-step join: fetch hashes from `items_sets`, names from the resolved loc table, then `items` rows by name (or by hash, see note below). For non-English locales, fall back per-row to `loc_eng` when the translation is missing.
- **Note**: items are still keyed by their English `name`, so the inner `SELECT … FROM items WHERE name = ANY($1)` should always use the English names for the lookup, while the *display* names come from the resolved loc table. This keeps `items` unchanged.

### 4. `GET /api/sets/:hash` ([server/index.js:227-251](server/index.js#L227-L251))
Already accepts `?loc=` and defaults to `eng`. Refactor to use the shared `resolveLocTable` helper for consistency and the strict regex check (currently the locale is interpolated without validation — a small injection risk to fix as part of this change).

### 5. Frontend
No URL/shape changes required for the default flow. The added `name` field on `/api/item` is additive.
Future: pass `?loc=<lang>` from a locale switcher; no further backend work needed once `loc_<lang>` is populated.

## Out of scope
- Schema changes to `items` (deferred — `items.name` stays as the English key for now).
- Populating non-English `loc_*` tables — that's a data task, separate from this plan.
- Frontend locale picker UI.

## Risks
- Locale param is interpolated into a table name. Mitigated by the strict `[a-z]{2,5}` allowlist in `resolveLocTable`.
- Per-row English fallback adds a second query for non-English locales when translations are partial — acceptable; revisit only if it shows up in latency.

## Test plan
- `/api/sets/<hash>` (no `loc`) returns English names — unchanged.
- `/api/sets/<hash>?loc=eng` returns the same as no-loc.
- `/api/sets/<hash>?loc=rus` returns Russian names once `loc_rus` is populated; falls back to English for hashes missing a translation.
- `/api/sets/<hash>?loc=../etc` is rejected by the regex and falls back to `loc_eng`.
- `/api/item?name=Burlap%20Shirt` returns `{ name, price, hash, url }` with `name` matching the English row.
