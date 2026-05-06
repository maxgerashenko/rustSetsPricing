# Scheduled Agent: Auto-Update slot_priorities Keywords (Script Only)

## Context

After [plans/move-item-priority-to-db.md](../plans/move-item-priority-to-db.md) lands, `slot_priorities.keywords` drives backend item sorting. New Steam items will appear that match no existing keyword and fall to the bottom of every view.

This plan adds a Node script that uses Claude (Haiku 4.5) to identify those unmatched items, infer the right slot, and **directly append** the new keywords to `slot_priorities.keywords`. The script runs on a schedule via Claude Code's `schedule` skill.

Human review (an approval/rejection workflow) is intentionally a **separate** plan — see [plans/slot-keyword-review.md](../plans/slot-keyword-review.md) (to be written). Ship this first, layer review on later.

## Why auto-apply is acceptable for v1

- Worst case from a bad keyword: items sort into the wrong section. Reversible by removing the keyword from the array (one SQL update).
- Haiku 4.5 with the slot definitions in context is highly reliable on simple substring classification.
- We constrain to `confidence: high` only; medium/low get logged but skipped.
- Audit log (a small `slot_keyword_changes` table) records every applied change so we can see what the agent did and revert if needed.

## Data model

Add to [server/db.js](../server/db.js):

```sql
CREATE TABLE IF NOT EXISTS slot_keyword_changes (
  id SERIAL PRIMARY KEY,
  slot_name TEXT NOT NULL,
  keyword TEXT NOT NULL,
  source_items TEXT[] NOT NULL,
  reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

Append-only audit log. Not a review queue.

## Script: `server/scripts/refresh_slot_keywords.js`

Standalone Node module using `pool` from [server/db.js](../server/db.js) and `@anthropic-ai/sdk`.

### Flow

1. **Load slots** — `SELECT name, keywords FROM slot_priorities ORDER BY priority`.
2. **Find unmatched items** — `SELECT name FROM items` then in-memory filter: keep names where no current keyword is a substring of `name.toLowerCase()`. Cap at 200/run.
3. **Skip already-applied keyword stems** — `LEFT JOIN slot_keyword_changes` to drop items whose obvious stem was tried before.
4. **Call Claude** — Haiku 4.5, JSON output, prompt-cache the slot table. Batch 50 names per request.
5. **Filter** — keep only `confidence: high`; drop suggestions whose keyword already exists in that slot.
6. **Apply** — for each survivor:
   ```sql
   UPDATE slot_priorities
      SET keywords = array_append(keywords, $1), updated_at = NOW()
    WHERE name = $2 AND NOT ($1 = ANY(keywords));
   INSERT INTO slot_keyword_changes (slot_name, keyword, source_items, reason) VALUES (...);
   ```
7. **Refresh server cache** — `POST /api/slots/reload` (new tiny endpoint, just calls `loadSlots()`); script no-ops if server unreachable.
8. **Log summary** — `[slots] scanned N, applied M keywords across K slots`.

### Claude call

```js
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()
const res = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 2048,
  system: [
    { type: 'text', text: SLOT_SEMANTICS_PROMPT, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: JSON.stringify(slotsForPrompt), cache_control: { type: 'ephemeral' } },
  ],
  messages: [{ role: 'user', content: `Items:\n${batch.join('\n')}\n\nReturn JSON array.` }],
})
```

`SLOT_SEMANTICS_PROMPT` explains: keywords are case-insensitive substring matches; suggest the shortest stem that uniquely identifies the slot; output schema with one example.

Expected output:
```json
[{ "item": "Lumberjack Beanie", "slot": "Masks", "keyword": "beanie", "confidence": "high", "reason": "headwear" }]
```

### CLI flags

- `--dry-run` — log what would be applied, no DB writes
- `--limit N` — items scanned (default 200)

No `--apply`; default is apply. No proposals.

## Server changes

Single new endpoint in [server/index.js](../server/index.js):

- `POST /api/slots/reload` — calls `loadSlots()`, returns `{ count }`. Lets the script invalidate the running server's cache after writes.

## Scheduling

Claude Code `schedule` skill registers a daily routine:
- Name: `slot-keyword-refresh`
- Cmd: `node /app/server/scripts/refresh_slot_keywords.js`
- Cadence: daily 04:00 UTC

Manual run: `npm run slots:refresh` (added to `package.json`).

## Files to modify / add

- **add** `server/scripts/refresh_slot_keywords.js`
- **edit** [server/db.js](../server/db.js) — `slot_keyword_changes` table
- **edit** [server/index.js](../server/index.js) — `POST /api/slots/reload`
- **edit** [package.json](../package.json) — `slots:refresh` script + `@anthropic-ai/sdk`
- **edit** `.env` — `ANTHROPIC_API_KEY`
- **edit** [TODO.md](../TODO.md) — own feature section linking this plan; separate entry for the future review feature

## Verification

1. Insert a test item whose name contains a clearly-missing stem (e.g. `Lumberjack Beanie` — no slot has `beanie`).
2. `npm run slots:refresh -- --dry-run` → log shows the proposed append `Masks ← beanie`.
3. Drop `--dry-run`; rerun → `SELECT keywords FROM slot_priorities WHERE name='Masks'` includes `beanie`; `slot_keyword_changes` has the row.
4. `curl 'localhost:3001/api/item?name=Lumberjack%20Beanie'` returns `slot: "Masks"`.
5. Re-run script → no duplicate write (filtered at step 3 + the SQL `NOT ANY` guard).
6. `/schedule list` shows `slot-keyword-refresh`; `/schedule run slot-keyword-refresh` fires manually.

## Risks

- **Bad keyword applied** — revert with `UPDATE slot_priorities SET keywords = array_remove(keywords, '<bad>') WHERE name = '...'`. Audit row stays.
- **Invalid JSON from Claude** — try/parse, skip batch, log raw output. Don't crash.
- **No `ANTHROPIC_API_KEY`** — exit non-zero with clear message so scheduler flags it.

## Out of scope

- Human review / approval queue — separate plan
- Auto-removal of stale keywords
- Multi-language inference
