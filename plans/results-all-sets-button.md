---
name: All sets button on results view
description: Add a second bottom button on the results view to navigate to the sets list, alongside the existing "← NEW LIST"
type: project
---

# All Sets Button on Results View

## Goal

Add a second bottom-of-page button on the results view that navigates to the sets list, sitting next to the existing `← NEW LIST` foothint.

## Current state

- [src/views/list_view/list_view.jsx:77-79](src/views/list_view/list_view.jsx#L77-L79) — single `← New list` foothint button calling `onBack`
- Sets list route exists (sets_list view) and is reachable from the input view via `onViewSets`

## Steps

1. In [list_view.jsx](src/views/list_view/list_view.jsx), accept an `onAllSets` prop (or use `useNavigate` directly).
2. Wrap the foothint area in a `.foothintRow` flex container; render two buttons:
   - `← NEW LIST` — existing `onBack`
   - `All sets` — `onAllSets` / `navigate('/sets')`
3. Add `.foothintRow` to [list_view.module.css](src/views/list_view/list_view.module.css): `display: flex; gap: 16px; justify-content: center;`. Reuse `.foothint` styling for both buttons.
4. Wire `onAllSets` in [app.jsx](src/app.jsx) where `<ListView>` is rendered.

## Out of scope

- Restyling the existing foothint
- Changing the sets list view itself
- Localization of the label

## Recommended model

Haiku — small, contained UI addition.
