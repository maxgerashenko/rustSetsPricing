---
name: Inline delete item on results view
description: Per-row inline delete in ListView with hover-reveal Delete button, reuses cached prices/images for surviving items, set re-created with new hash
type: project
---

# Inline Delete Item on Results View

## Goal

Add a **per-row inline Delete button** on the results view, mirroring the inline Edit pattern from [plans/inline-edit-list.md](inline-edit-list.md). Hovering a row reveals a Delete button (same hover/animation pattern as `deleteButton` in sets list). Clicking it removes the row locally and re-syncs the set: the old set+hash is deleted server-side, a new set is created (deterministic hash from items), and **no price/image refetching happens** — surviving rows already hold their `hash`/`price`/`url`, and the new set is registered by passing those existing item hashes.

## Depends on

[plans/inline-edit-list.md](inline-edit-list.md) — establishes the hover-reveal action button CSS, the `syncSet(next)` helper, and the multi-action edit-mode infrastructure on rows. This plan reuses all three.

## Current state

- [src/views/list_view/list_view.jsx:50-60](src/views/list_view/list_view.jsx#L50-L60) — `POST /api/sets` already accepts `{ items, hashes }`; passing the existing per-item hashes is what allows the server to skip refetching.
- [src/views/list_view/items_list.jsx:43-46](src/views/list_view/items_list.jsx#L43-L46) — item row currently has no delete affordance.
- [src/views/sets_list/sets_list.jsx:32-46](src/views/sets_list/sets_list.jsx#L32-L46) — reference `handleDelete` pattern (DELETE `/api/sets/:hash` + snackbar confirm).
- [server/index.js:266](server/index.js#L266) — `DELETE /api/sets/:hash` exists.
- After inline-edit-list ships, `syncSet(next)` in `list_view.jsx` will already DELETE the old set hash and POST a new one with the surviving items + hashes — delete just calls it with a filtered `next`.

## Steps

### 1. Items list — delete button UI
- In [items_list.jsx](src/views/list_view/items_list.jsx) accept `onDelete(name)` prop.
- Render a `.deleteButton` next to (or paired with) the existing inline `.editButton`:
  - Hover-reveal animation matches `.editButton` (`width: 0 → 64px`, `opacity: 0 → 1`).
  - `e.stopPropagation()` on click so the row's market-link click doesn't fire.
  - Disable while the row is in edit mode or while `setHash` is null.
- Confirmation: reuse the snackbar confirm pattern from [src/views/sets_list/sets_list.jsx](src/views/sets_list/sets_list.jsx) (commit `4a36f71`) — Undo window before commit, no destructive action without it.

### 2. CSS
- Add `.deleteButton` to [list_view.module.css](src/views/list_view/list_view.module.css) mirroring the `.editButton` rule introduced in inline-edit-list.
- Place edit + delete buttons in a small action cluster on the right side of `.item` (before `.price`, or as an absolute-positioned overlay), so both reveal together on hover.

### 3. List view — delete handler

In [list_view.jsx](src/views/list_view/list_view.jsx) add `handleDelete(name)`:

```js
const handleDelete = (name) => {
  setItems(prev => {
    const next = prev.filter(it => it.name !== name)
    if (next.length === 0) {
      // empty set: delete server-side, clear local hash, do not POST a new one
      if (setHash) fetch(`/api/sets/${setHash}`, { method: 'DELETE' }).catch(() => {})
      setSetHash(null)
      return next
    }
    syncSet(next)
    return next
  })
}
```

`syncSet(next)` is the helper added in inline-edit-list — DELETEs old hash, POSTs `{ items: next.map(n=>n.name), hashes: next.map(n=>n.hash).filter(Boolean) }`, updates `setHash` from response. **No per-item refetch happens** because surviving rows already carry `hash`/`price`/`url` from the initial load.

Pass `onDelete={handleDelete}` to `<ItemsList>`.

### 4. Edge cases
- Last item deleted → set is empty: DELETE the old hash, do not POST a new set, clear `setHash`. UI shows the empty state (or auto-redirects to input view — decide during implementation, prefer empty state for undo-room).
- Delete fired before initial set creation finishes (`setHash == null`) → disable the delete button until `setHash` is set, same gate as edit.
- Delete + rename racing on different rows → both go through `syncSet(next)` with the latest `items` snapshot from the functional `setItems` updater, so the last write wins safely.

## Out of scope

- Adding new rows inline (still requires `+ New set` flow).
- Drag reorder.
- Bulk delete / multi-select.
- Undo beyond the snackbar window (no history stack).
- Localization of the delete button label.

## Recommended model

Sonnet — single-view UI feature with state coordination, building directly on inline-edit-list's helpers. No new backend or schema work.
