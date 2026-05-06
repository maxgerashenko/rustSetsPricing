# Move ITEM_PRIORITY to Database; Sort on Backend

## Context

`ITEM_PRIORITY` (slot keyword → priority mapping for clothing categories: Masks, Chest Armor, Jackets, Hoodies, Pants, Boots, Gloves) currently lives as a hardcoded JS constant in [src/shared/itemSorting.js](../src/shared/itemSorting.js#L3) and is applied during render at two call sites: [src/views/sets_list/set_item.jsx:10](../src/views/sets_list/set_item.jsx#L10) and [src/views/list_view/items_list.jsx:11](../src/views/list_view/items_list.jsx#L11).

We want the slot definitions (name → keywords → priority) stored in Postgres so they can be edited at runtime, sorting performed on the backend, and the frontend simply renders items in the order it receives them. A future agent task (out of scope here) will parse the items table and update slot patterns automatically.

## Data model

New table in [server/db.js](../server/db.js):

```sql
CREATE TABLE IF NOT EXISTS slot_priorities (
  name TEXT PRIMARY KEY,
  priority INT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS slot_priorities_priority_idx ON slot_priorities(priority);
```

Seed once on `initDb()` — only if table empty — with the 7 current entries from [src/shared/itemSorting.js:3-39](../src/shared/itemSorting.js#L3-L39).

## Backend changes ([server/index.js](../server/index.js))

1. **In-memory cache** of slot rows, loaded on startup and invalidated whenever a write endpoint mutates the table. Keyword matching against every item is hot-path; we don't want a DB query per `/api/item` call.

   ```js
   let slotsCache = null
   async function loadSlots() {
     const { rows } = await pool.query('SELECT name, priority, keywords FROM slot_priorities ORDER BY priority')
     slotsCache = rows
   }
   function getPriority(itemName) {
     const lower = itemName.toLowerCase()
     for (const slot of slotsCache) {
       for (const kw of slot.keywords) if (lower.includes(kw)) return { priority: slot.priority, slot: slot.name }
     }
     return { priority: Number.MAX_SAFE_INTEGER, slot: null }
   }
   ```

2. **Extend [`/api/item`](../server/index.js#L90)** — include `slot` and `priority` in the JSON response (alongside existing `price`, `hash`, `url`). No DB schema change to `items` table.

3. **Sort `/api/sets`** ([server/index.js:165](../server/index.js#L165)) — after building `itemData`, sort by `(priority, name)` server-side before returning.

4. **New CRUD endpoints** for slot patterns:
   - `GET /api/slots` → `[{ name, priority, keywords }]` ordered by priority
   - `POST /api/slots` body `{ name, priority, keywords }` → insert new slot
   - `PUT /api/slots/:name` body `{ priority?, keywords? }` → update one slot
   - `DELETE /api/slots/:name` → remove

   Each write calls `loadSlots()` to refresh the in-memory cache.

## Frontend changes

Frontend no longer owns the keyword logic. It sorts by the numeric `priority` field that the backend now returns on each item.

1. **[src/shared/itemSorting.js](../src/shared/itemSorting.js)** — replace contents with a tiny helper:
   ```js
   export const sortItems = (items) =>
     [...items].sort((a, b) =>
       (a.priority ?? Infinity) - (b.priority ?? Infinity) || a.name.localeCompare(b.name)
     )
   ```
   Drop `ITEM_PRIORITY`, `getPriority`, `updateItemPriority`.

2. **[src/views/list_view/items_list.jsx:11](../src/views/list_view/items_list.jsx#L11)** — keep `sortItems(items)` call; it now uses the priority field returned by `/api/item`. No other change. (Items arrive in arbitrary completion order from per-item fetches, so a numeric-priority sort is still required client-side here.)

3. **[src/views/sets_list/set_item.jsx:10](../src/views/sets_list/set_item.jsx#L10)** — remove the `sortItems` call and import; `/api/sets` returns items pre-sorted.

## Verification

1. `docker compose up` — confirm `[DB] schema ready` and slot seed log line on first boot of fresh DB.
2. `curl localhost:3001/api/slots` returns 7 seeded rows.
3. `curl 'localhost:3001/api/item?name=Burlap%20Shirt'` includes `slot` and `priority`.
4. Open `/sets` in browser — set cards still show items in canonical order (mask → chest → jacket → … → gloves).
5. Submit a new list on `/` — results screen orders items the same way.
6. `curl -X PUT localhost:3001/api/slots/Boots -H 'content-type: application/json' -d '{"priority":1}'` then refresh `/sets` — boots should now sort first, confirming live update.
7. `curl -X POST localhost:3001/api/slots -d '{"name":"Helmets","priority":0,"keywords":["helmet"]}'` — new slot affects subsequent `/api/item` calls (existing cached items in `items` table are unaffected since slot is computed at response time, not stored).

## Files to modify

- [server/db.js](../server/db.js) — add table + seed
- [server/index.js](../server/index.js) — slot cache, helper, `/api/item` + `/api/sets` changes, 4 new `/api/slots` endpoints
- [src/shared/itemSorting.js](../src/shared/itemSorting.js) — slim down to numeric-priority sort
- [src/views/sets_list/set_item.jsx](../src/views/sets_list/set_item.jsx) — remove sortItems
- [TODO.md](../TODO.md) — reference this plan + add future agent task

## Out of scope

Auto-update agent: a script that walks the `items` table, clusters unknown names against slot keywords, and proposes/applies edits to `slot_priorities` on a schedule. Tracked as a single TODO entry; design left for a follow-up plan.
