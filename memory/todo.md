# TODO

## Screen 3 — Edit (Priority)
- [ ] Create `EditScreen` component: 4-col edit rows (drag handle · thumb · input · delete), add item footer, Cancel/Save actions
- [ ] Drag-and-drop reorder via handle; drop target highlights
- [ ] Keyboard support: `Enter` adds row below, `Backspace` on empty removes row
- [ ] Update App state machine: `'input' | 'results' | 'edit'` (currently boolean `list`/`!list`)
- [ ] Edit flow: save edits → reprice items → return to Results

## API Extensions item
- [ ] Extend `/api/item` to return `slot` (e.g., `Head`, `Chest`) and `trend` (24h delta)

## Sorting / Slot Priorities
- [ ] Move `ITEM_PRIORITY` to `slot_priorities` table; sort on backend; add `/api/slots` CRUD — see [plans/move-item-priority-to-db.md](plans/move-item-priority-to-db.md)

## Slot Keyword Agent (script)
- [ ] Scheduled Node script using Claude Haiku 4.5 to scan unmatched items and auto-apply high-confidence keyword additions to `slot_priorities`; audit log in `slot_keyword_changes` — see [plans/slot-keyword-agent-script.md](plans/slot-keyword-agent-script.md)

## Slot Keyword Review (human-in-the-loop)
- [ ] Review queue + `/api/slot-proposals` endpoints for medium-confidence agent suggestions; tiered routing in the agent script — see [plans/slot-keyword-review.md](plans/slot-keyword-review.md)

## Delete Sets
- [ ] Implement delete sets feature — see [plans/delete-sets.md](plans/delete-sets.md)

## Snackbar Confirmation
- [ ] Add snackbar component with countdown-based confirm/cancel for destructive actions — see [plans/snackbar-confirm.md](plans/snackbar-confirm.md)

## Future Features
- [ ] 24h trend delta per row: `▲` green / `▼` red (requires `trend` API field)
- [ ] Show price as stale when cache TTL nearing expiry

## Ops
- [ ] Add `.env.example` with all required vars documented
- [ ] Add `server` container healthcheck to docker-compose
