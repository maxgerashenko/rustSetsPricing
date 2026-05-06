# Plan: Snackbar Confirmation

## Goal
Replace blocking confirmation dialogs with a non-blocking snackbar that auto-confirms after a short countdown, allowing the user to cancel via a button. First consumer: delete sets.

## Behavior

1. User triggers a destructive action (e.g. clicks Delete on a set).
2. Snackbar slides up from the bottom of the screen.
3. Message reads e.g. `"Set will be deleted in 3s"` with a **Cancel** button.
4. Countdown ticks visually (3 → 2 → 1).
5. If user does **not** press Cancel before timeout: action proceeds (API request fires).
6. If user **does** press Cancel: snackbar dismisses, no request made, UI rolls back to previous state.
7. Multiple snackbars stack (or last replaces previous — TBD; default: replace).

## API Design

**Component:** `Snackbar` (singleton, mounted once at app root)

**Hook:** `useSnackbar()` — returns `{ confirm, dismiss }`

```js
const { confirm } = useSnackbar()

confirm({
  message: 'Set will be deleted in {n}s',  // {n} = countdown
  actionLabel: 'Cancel',
  delayMs: 3000,
  onConfirm: () => api.deleteSet(hash),    // fires if not cancelled
  onCancel: () => {},                       // fires if cancelled
})
```

## Implementation Steps

### 1. Snackbar context + provider
- New file: [src/shared/snackbar/](../../src/shared/) — `snackbar.jsx`, `snackbar.module.css`
- `SnackbarProvider` holds queue/current state; `useSnackbar()` exposes `confirm()`
- Wrap `<App />` with provider in [main.jsx](../../src/main.jsx)

### 2. Snackbar component (UI)
Position: fixed, bottom-center, slide-up animation.

Use design tokens from [design/styles.css](../../design/styles.css):
- Background: `var(--bg-elev-2)`
- Border: `1px solid var(--line-strong)`
- Radius: `var(--radius-card)`
- Padding: `var(--pad)`
- Text: `var(--text)`
- Cancel button: outlined, `var(--accent)` text on hover
- Shadow: subtle drop shadow for elevation
- Font: `var(--font-ui)`

Layout: `[message text] [countdown] [Cancel button]`

### 3. Countdown logic
- `useEffect` with `setInterval` updating remaining seconds
- On reach 0: call `onConfirm`, dismiss snackbar
- On Cancel click: clear interval, call `onCancel`, dismiss
- On unmount: clear interval (don't fire either callback)

### 4. Optimistic UI in caller
The caller removes the item from local state **immediately** on trigger (so user sees deletion).
- `onConfirm` fires the API call
- `onCancel` restores the item in local state

### 5. Wire into delete sets
Update [sets_list.jsx](../../src/views/sets_list/sets_list.jsx) `handleDelete`:
```js
const handleDelete = (setHash) => {
  const previous = sets
  setSets(sets.filter(s => s.hash !== setHash))  // optimistic
  confirm({
    message: 'Set will be deleted in {n}s',
    actionLabel: 'Cancel',
    delayMs: 3000,
    onConfirm: async () => {
      const res = await fetch(`/api/sets/${setHash}`, { method: 'DELETE' })
      if (!res.ok) setSets(previous)  // rollback on API failure
    },
    onCancel: () => setSets(previous),
  })
}
```

### 6. Manual test
- Click delete → set disappears, snackbar shows countdown
- Wait 3s → DELETE request fires, set stays gone
- Click delete → click Cancel → set returns, no request fires
- Click delete on set A, then set B before countdown ends → behavior matches stacking decision (replace by default)

## Out of scope
- Toast notifications for non-destructive feedback (success messages, errors)
- Snackbar queue with stacking (start with single-replace)
- Undo after timeout completes
- Server-side soft-delete window

## Recommended model
Sonnet — new shared component + integration across files; cross-cutting but contained.
