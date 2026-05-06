---
name: Inline edit on results view
description: Per-row inline rename in ListView with hover-reveal Edit button, prices reused for unchanged items, set re-created (new hash) on save
type: project
---

# Inline Edit on Results View

## Goal

Replace the modal-style "Edit List" flow with **per-row inline edits** on the results view. Hovering a row reveals an Edit button (same hover/animation pattern as `deleteButton` in sets list). Clicking it swaps the item name span for an input. Pressing Enter (or blur) commits the rename: only the changed item is re-fetched, all other prices are copied, the old set+hash is deleted, and a new set is created (hash deterministic from items list).

## Current state

- [src/views/list_view/list_view.jsx:18-66](src/views/list_view/list_view.jsx#L18-L66) — fetches all items, posts to `/api/sets`, stores `setHash`
- [src/views/list_view/list_controls.jsx:32-35](src/views/list_view/list_controls.jsx#L32-L35) — `Edit List` button calls `onBack` (returns to input view)
- [src/views/list_view/list_view.jsx:77-79](src/views/list_view/list_view.jsx#L77-L79) — single foothint `← New list` button at the bottom
- [src/views/list_view/items_list.jsx:43-46](src/views/list_view/items_list.jsx#L43-L46) — item name rendered as static `<span>`
- [src/views/sets_list/sets_list.module.css:226-264](src/views/sets_list/sets_list.module.css#L226-L264) — reference hover/animation pattern (`width: 0` → `width: 80px` on `cardWrapper:hover`)
- Backend: `POST /api/sets` (create) and `DELETE /api/sets/:hash` already exist ([server/index.js:253](server/index.js#L253))

## Steps

### 1. Items list — inline edit UI
- In [items_list.jsx](src/views/list_view/items_list.jsx) accept `onRename(oldName, newName)` prop.
- Track `editingName` local state (the row currently being edited).
- Render the name area as either:
  - static `<span>` + hover-revealed Edit button (animated width like `deleteButton`)
  - or `<input value={draft}>` when editing
- Row click should NOT navigate while editing (`e.stopPropagation` on input/edit button).
- Input handlers:
  - `Enter` → commit: call `onRename(oldName, draft.trim())`, exit edit mode
  - `Escape` → cancel
  - `Blur` → cancel (don't auto-commit, to avoid accidents)
- If new name equals old or is empty → just exit edit mode, no rename.

### 2. CSS
- Add `.editButton` mirroring `.deleteButton` pattern in [list_view.module.css](src/views/list_view/list_view.module.css): `width: 0; opacity: 0` collapsed; `.item:hover .editButton { width: 64px; opacity: 1 }`.
- Position inside `.item` flex row (after name, before price, or as overlay).

### 3. List view — rename handler
In [list_view.jsx](src/views/list_view/list_view.jsx) add `handleRename(oldName, newName)`:

```js
const handleRename = async (oldName, newName) => {
  if (!newName || newName === oldName) return
  // 1. update local items: rename row, mark as loading, clear price/hash/url
  setItems(prev => prev.map(it =>
    it.name === oldName
      ? { name: newName, status: 'loading', price: null, url: null, hash: null }
      : it
  ))
  // 2. fetch only the new item
  let renamed
  try { renamed = await fetchItem(newName) } catch { renamed = null }
  setItems(prev => {
    const next = prev.map(it =>
      it.name === newName && it.status === 'loading'
        ? renamed
          ? { ...it, status: 'done', ...renamed }
          : { ...it, status: 'error' }
        : it
    )
    // 3. delete old set, create new (using next snapshot)
    syncSet(next)
    return next
  })
}
```

`syncSet(next)`:
- DELETE `/api/sets/:setHash` (fire-and-forget) if `setHash` exists
- POST `/api/sets` with `{ items: next.map(n=>n.name), hashes: next.map(n=>n.hash).filter(Boolean) }`
- update `setHash` from response (new hash, since hash is deterministic from items)

Edge case: if user edits before initial set creation finishes, queue the rename or rely on the abort controller — simplest: only allow edit when `setHash != null` (disable edit button until then).

### 4. Remove "Edit List" button
- Delete the primary `Edit List` button from [list_controls.jsx:32-35](src/views/list_view/list_controls.jsx#L32-L35).
- Drop the `onEdit` prop from `ListControls` and from the `<ListControls>` call in `list_view.jsx` (the `onBack`/foothint still handles "new list").

## Out of scope

- Adding a second bottom-row "All sets" button — see [plans/results-all-sets-button.md](results-all-sets-button.md).
- Adding new rows or deleting rows inline (the original "Screen 3 — Edit" plan covered this; this plan only handles **rename**).
- Drag reorder.
- Optimistic price for the new item — show a loading skeleton until the fetch returns (consistent with initial load).
- Undo of rename.
- Localization of new button labels.

## Recommended model

Sonnet — multi-file UI feature with state coordination, but no new backend or schema work.
