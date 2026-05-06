# Human Review Layer for Slot Keyword Agent

## Context

[plans/slot-keyword-agent-script.md](../plans/slot-keyword-agent-script.md) ships an agent script that auto-applies high-confidence keyword suggestions and logs them to `slot_keyword_changes`. This plan adds a human-in-the-loop layer on top: instead of (or in addition to) auto-apply, suggestions land in a review queue, a human approves/rejects, and only approved suggestions mutate `slot_priorities.keywords`.

Built **after** the agent script is running and we've seen real Claude output for a week or two — so we know which categories of suggestion need review and which are safe to keep auto-applying.

## Design choices to confirm before implementing

1. **Co-exist or replace?** Two options:
   - **Tiered**: agent auto-applies `confidence: high`; `medium` goes to review queue; `low` discarded. Default.
   - **Replace**: all suggestions go to review; auto-apply turned off.

   Recommendation: tiered — auto-apply has been working, review only catches the ambiguous middle.

2. **Where does review happen?** Three options:
   - `curl` against new endpoints (cheapest)
   - Tiny admin page at `/admin/slots`
   - Slack / email digest with approve links

   Recommendation: endpoints first, small admin page once the queue has real volume.

## Data model

New table:

```sql
CREATE TABLE IF NOT EXISTS slot_keyword_proposals (
  id SERIAL PRIMARY KEY,
  slot_name TEXT NOT NULL REFERENCES slot_priorities(name) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source_items TEXT[] NOT NULL,
  confidence TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (slot_name, keyword, status)
);
```

Status: `pending | approved | rejected | applied`. Partial uniqueness via `status` so a rejected proposal doesn't permanently block re-suggesting if later items justify it.

## Script changes

[server/scripts/refresh_slot_keywords.js](../server/scripts/refresh_slot_keywords.js) gains tiered routing:

```js
if (suggestion.confidence === 'high') {
  await applyKeyword(suggestion)            // existing v1 path
} else if (suggestion.confidence === 'medium') {
  await insertProposal(suggestion)          // new
}
```

`insertProposal` does `INSERT ... ON CONFLICT (slot_name, keyword, status) DO NOTHING` so re-running the script doesn't pile up duplicates.

## Server endpoints

Add to [server/index.js](../server/index.js):

- `GET /api/slot-proposals?status=pending` → `[{ id, slot_name, keyword, source_items, confidence, reason, created_at }]`
- `POST /api/slot-proposals/:id/approve`
  - `UPDATE slot_keyword_proposals SET status='applied', reviewed_at=NOW() WHERE id=$1`
  - Append keyword to `slot_priorities.keywords` (same SQL as the script's apply path)
  - Insert audit row in `slot_keyword_changes`
  - Refresh `slotsCache`
- `POST /api/slot-proposals/:id/reject` — sets `status='rejected', reviewed_at=NOW()`. No mutation to `slot_priorities`.
- `POST /api/slot-proposals/:id/edit` (optional) — allows reviewer to change the `keyword` text before approving (e.g. shorten `"hockey mask"` → `"hockey"`). Body `{ keyword }`.

All four guarded by an admin token check (env var `ADMIN_TOKEN`, sent as `Authorization: Bearer ...`). No anonymous mutations.

## Optional admin page

`/admin/slots` — single React route gated by the same token in a header form. Lists pending proposals with three buttons each: **Approve / Reject / Edit**. Out of scope for v1 of this plan; endpoints first.

## Files to modify / add

- **edit** [server/db.js](../server/db.js) — `slot_keyword_proposals` table
- **edit** [server/scripts/refresh_slot_keywords.js](../server/scripts/refresh_slot_keywords.js) — tiered routing; insert medium-confidence proposals
- **edit** [server/index.js](../server/index.js) — four `/api/slot-proposals` endpoints + admin token middleware
- **edit** `.env` — `ADMIN_TOKEN`
- **edit** [TODO.md](../TODO.md) — mark agent-script feature done; this plan becomes the open item

## Verification

1. Force a medium-confidence suggestion (e.g. seed item `Tactical Headgear` — ambiguous between Masks and a hypothetical Helmet slot).
2. Run script → `slot_keyword_proposals` row with `status='pending'`; `slot_priorities` unchanged.
3. `curl -H 'authorization: Bearer $ADMIN_TOKEN' localhost:3001/api/slot-proposals?status=pending` lists the row.
4. `curl -X POST -H 'authorization: Bearer $ADMIN_TOKEN' localhost:3001/api/slot-proposals/1/approve` → keyword appears in `slot_priorities.keywords`; `slot_keyword_changes` audit row written; status `'applied'`.
5. `curl 'localhost:3001/api/item?name=Tactical%20Headgear'` returns the right slot.
6. Reject path: insert another proposal, hit `/reject`, confirm `slot_priorities` untouched and status `'rejected'`.

## Risks

- **Auth token leak** — keep `ADMIN_TOKEN` out of client code; rotate via env var. Don't log auth headers.
- **Approve without cache refresh** — bug where `slotsCache` not reloaded means new keyword doesn't take effect until restart. Tested at step 5 above.
- **Queue grows unbounded** — add a cron `DELETE FROM slot_keyword_proposals WHERE status IN ('rejected','applied') AND reviewed_at < NOW() - INTERVAL '90 days'`. Out of scope for v1 of this plan.

## Out of scope

- Admin UI page
- Multi-reviewer workflow / role separation
- Notifications (Slack / email) when proposals queue up
