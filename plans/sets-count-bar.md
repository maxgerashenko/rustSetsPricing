# Plan: Sets Count Status Bar

## Goal
Add a small monospaced status bar at the bottom of the Sets List view, mirroring the input view's `parseRow` (`7 · ITEMS DETECTED · ONE PER LINE · OR COMMA-SEPARATED`), showing the saved set count and a contextual tagline.

## Current state
- [src/views/sets_list/sets_list.jsx](../src/views/sets_list/sets_list.jsx) renders a header, the list (or empty/loading branch), and a `← New set` foothint button.
- No count or summary indicator currently shown.
- Reference style: `.parseRow` / `.parseCount` in [src/app.module.css:97](../src/app.module.css#L97). Already importable via `appStyles` (sets_list.jsx line 3).
- `.container` uses `grid-template-rows: auto 1fr auto` ([sets_list.module.css:4](../src/views/sets_list/sets_list.module.css#L4)).

## Wording

**Left (count) — `N · SET(S) SAVED`**
- 0 → `0 · SETS SAVED`
- 1 → `1 · SET SAVED`
- N → `N · SETS SAVED`

**Right (tagline) — count-dependent:**
- 0 → `NO SETS YET`
- 1 → `JUST ONE SO FAR`
- ≥2 → `ALL SETS ARE UNIQUE`

Uppercase is applied via CSS `text-transform`, so JSX stays sentence case.

Hidden during `loading` to avoid flicker.

## Steps

### 1. Render the bar — [sets_list.jsx](../src/views/sets_list/sets_list.jsx)
Insert between the list/empty branch and the foothint button:

```jsx
{!loading && (
  <div className={styles.countBar}>
    <span className={appStyles.parseCount}>
      <b>{sets.length}</b> · {sets.length === 1 ? 'set' : 'sets'} saved
    </span>
    <span>
      {sets.length === 0
        ? 'No sets yet'
        : sets.length === 1
          ? 'Just one so far'
          : 'All sets are unique'}
    </span>
  </div>
)}
```

### 2. Styles — [sets_list.module.css](../src/views/sets_list/sets_list.module.css)
- Update `.container` `grid-template-rows` to `auto 1fr auto auto`.
- Add `.countBar` as a wrapped pill (standalone version of `.parseRow`):

```css
.countBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-elev-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  text-transform: uppercase;
  flex-shrink: 0;
}
```

Reuse `appStyles.parseCount` for the left span (accent-colored `<b>`).

### 3. Manual test
- Open Sets view with 0 sets → bar shows `0 · SETS SAVED` / `NO SETS YET`.
- With 1 set → `1 · SET SAVED` / `JUST ONE SO FAR`.
- With ≥2 sets → `N · SETS SAVED` / `ALL SETS ARE UNIQUE`.
- During loading → bar hidden.
- Delete a set → count + tagline update live.

## Out of scope
- Total cost summary across all sets.
- Filters/sort indicators in the bar.
- Animations on count change.
- Adding the same bar to other views.

## Recommended model
Haiku — single-view cosmetic addition, two files, no logic crossing boundaries.
