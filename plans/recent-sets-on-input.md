## Goal
Show the 3 most recently loaded sets on the main input page, directly under the title and above the paste textarea, with a "View Your Sets" button styled like the Paste button that navigates to the full sets list. Remove the existing bottom-of-page "View Your Sets →" button.

## Depends on
- [plans/set-last-loaded-timestamp.md](set-last-loaded-timestamp.md) — `last_loaded_at` column + ordering. This plan assumes that work is already merged (or implemented as part of it).

## Current state

- Input page renders title + form, with a separate `setsBtn` at the bottom of [src/views/input_view/input_view.jsx:76-84](../src/views/input_view/input_view.jsx#L76-L84) that calls `onViewSets` → `navigate('/sets')` ([src/app.jsx:82](../src/app.jsx#L82)).
- Paste button (visual reference for the new "View Your Sets" button): `styles.pasteBtn` at [src/views/input_view/input_view.jsx:64-67](../src/views/input_view/input_view.jsx#L64-L67).
- Full sets list page lives at `/sets` rendered by [src/views/sets_list/sets_list.jsx](../src/views/sets_list/sets_list.jsx); it fetches `GET /api/sets`.
- `GET /api/sets` at [server/index.js:165-204](../server/index.js#L165-L204) currently returns ALL sets ordered by `created_at DESC`. After the timestamp plan lands, this becomes `ORDER BY last_loaded_at DESC NULLS LAST`.

## Steps

### 1. Backend — support `?limit=` and return total count
Extend `GET /api/sets` to accept an optional `limit` query param, and always return the **total** number of sets in the table (independent of `limit`) so the input-view header can show it.

```js
const limit = Number.parseInt(req.query.limit, 10)
const limitClause = Number.isFinite(limit) && limit > 0 ? ` LIMIT ${limit}` : ''
const [{ rows: sets }, { rows: countRows }] = await Promise.all([
  pool.query(
    `SELECT set_hash, items, created_at, last_loaded_at
     FROM items_sets
     ORDER BY last_loaded_at DESC NULLS LAST${limitClause}`
  ),
  pool.query('SELECT COUNT(*)::int AS total FROM items_sets'),
])
// ...build setsData as before...
res.json({ total: countRows[0].total, sets: setsData })
```

**Response shape change** (breaking): now `{ total, sets: [...] }` instead of a bare array. Update the consumer at [src/views/sets_list/sets_list.jsx:17](../src/views/sets_list/sets_list.jsx#L17) to read `data.sets`.

`limit` is parsed as an integer — safe to interpolate. No new endpoint needed.

### 2. New component — `RecentSets`
New file: `src/views/input_view/recent_sets.jsx` + `recent_sets.module.css`.

Responsibilities:
- On mount, `fetch('/api/sets?limit=3')` → reads `{ total, sets }`.
- **Header row** styled like `parseRow` from [src/views/input_view/input_view.jsx:57-62](../src/views/input_view/input_view.jsx#L57-L62):
  - Left: `<b>{total}</b> · {total === 1 ? 'set' : 'sets'} saved` (mirrors `<b>7</b> · items detected`).
  - Right: a **"View all"** text button (replaces the static `One per line · or comma-separated` hint). Click → `onViewAll()` → navigates to `/sets`. Style as a minimal text button — same typographic weight as the right-side hint, but interactive (cursor pointer, accent on hover).
  - Reuse `parseRow` / `parseCount` classes from `app.module.css` if accessible, or duplicate the rule into `recent_sets.module.css` keyed off the same tokens (`var(--font-mono)`, `var(--text-mute)`, etc).
- Below header: up to 3 set previews. Each preview shows the same image stack / total-price shape used by the existing `SetItem` ([src/views/sets_list/set_item.jsx](../src/views/sets_list/set_item.jsx)) but in a smaller, tap-to-load form. Clicking a preview calls `navigate('/list?set=<hash>')`.
- If `total === 0`: render nothing (no empty state on the input page).
- The bottom "View Your Sets" `pasteBtn`-styled button described in the original plan is **dropped** — the header-row "View all" link replaces it. (Update step 5 below accordingly.)

Sketch:
```jsx
export default function RecentSets({ onOpenSet, onViewAll }) {
  const [sets, setSets] = useState([])
  useEffect(() => {
    fetch('/api/sets?limit=3')
      .then(r => r.ok ? r.json() : [])
      .then(setSets)
      .catch(() => {})
  }, [])
  if (sets.length === 0) return null
  return (
    <section className={styles.recent}>
      <h3 className={styles.heading}>Recent</h3>
      <div className={styles.list}>
        {sets.map(set => (
          <button key={set.hash} className={styles.row} onClick={() => onOpenSet(set.hash)}>
            {/* thumb stack + total */}
          </button>
        ))}
      </div>
      <button className={pasteBtnClass} onClick={onViewAll}>
        View Your Sets
      </button>
    </section>
  )
}
```

Reuse `pasteBtn` styling — import `app.module.css` and apply `appStyles.pasteBtn`, OR extract the paste button visual into a shared class. Prefer the simpler import-and-apply path.

### 3. Wire into `InputView`
In [src/views/input_view/input_view.jsx](../src/views/input_view/input_view.jsx):
- Accept new props: `onOpenSet` (hash → navigate to list view), keep `onViewSets`.
- Render `<RecentSets onOpenSet={onOpenSet} onViewAll={onViewSets} />` between the `<h1>` headline and the `<form>`. Since the headline lives in `app.jsx`, place `RecentSets` at the very top of the InputView return — visually it sits below the title and above the textarea.
- Remove the bottom `setsBtn` block ([src/views/input_view/input_view.jsx:76-84](../src/views/input_view/input_view.jsx#L76-L84)).

### 4. Wire navigation in `app.jsx`
Pass `onOpenSet={hash => navigate(`/list?set=${hash}`)}` to `InputView` ([src/app.jsx:78-84](../src/app.jsx#L78-L84)). Keep `onViewSets` as-is.

### 5. Styling notes
- Header row: matches `parseRow` (mono font, mute color, tight padding). Right-side "View all" reads as a text link, not a filled button.
- Recent strip: tight vertical list of 3 rows, each row showing item thumbs (overlapping or in a small grid) + total price on the right. Compact — should not push the textarea below the fold.
- Use existing tokens (`var(--bg-elev-2)`, `var(--line-strong)`, `var(--radius-card)`, `var(--pad)`).
- Remove the bottom-of-page `setsBtn` entirely — the header-row "View all" is the single entry point to `/sets` from the input view.

### 6. Manual test
- Load `/` with 0 sets in DB → no Recent section, no View Your Sets button visible (acceptable, since there's nothing to view).
- Load `/` with ≥1 set → Recent section shows up to 3, ordered by `last_loaded_at DESC`.
- Click a recent set → opens `/list?set=<hash>`, which (per timestamp plan) bumps `last_loaded_at` server-side.
- Return to `/` → that set is now first in Recent.
- Header reads e.g. `<b>5</b> · sets saved` on the left, `View all` link on the right.
- Click "View all" → navigates to `/sets`.
- Confirm bottom `setsBtn` no longer renders.
- `/sets` page still renders correctly after the response-shape change (`data.sets`).

## Out of scope
- Empty-state UI on input page when no sets exist (keep `null`).
- Currency toggle on the recent strip (defer; full sets list still has it).
- Inline delete from the recent strip.
- Skeleton/loading shimmer for the recent strip — `null` until loaded is fine.

## Recommended model
Haiku — small new component + two small wiring changes; backend tweak is one line.
