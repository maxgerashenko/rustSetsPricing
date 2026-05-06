# Plan: Delete Sets

## Goal
Allow users to delete a saved set from the Sets list. Removes the row from `items_sets` permanently.

## Current state
- Frontend delete handler: [sets_list.jsx:29-38](../../src/views/sets_list/sets_list.jsx#L29-L38) — already calls `DELETE /api/sets/:hash`
- Delete button in [set_item.jsx:71-76](../../src/views/sets_list/set_item.jsx#L71-L76) — already wired to `onDelete`
- **Missing:** backend `DELETE /api/sets/:hash` endpoint

## Steps

### 1. Backend endpoint
Add to [server/index.js](../../server/index.js) near existing `/api/sets` handlers (~line 227):

```js
app.delete('/api/sets/:hash', async (req, res) => {
  const { hash } = req.params
  if (!hash) return res.status(400).json({ error: 'hash required' })
  try {
    const result = await pool.query(
      'DELETE FROM items_sets WHERE set_hash = $1',
      [hash]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  } catch (err) {
    console.error('[Sets] delete error:', err.message)
    res.status(500).json({ error: 'Failed to delete set' })
  }
})
```

### 2. Manual test
- Create set → navigate to Sets list → click Delete → confirm → verify removed from UI
- Refresh page → verify gone from DB
- Check server logs for errors

## Out of scope
- Soft-delete / restore
- Undo
- Bulk delete
- Confirmation dialog (delete is immediate)

## Recommended model
Sonnet — touches backend + frontend (cross-domain, small).
