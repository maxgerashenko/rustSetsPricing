# Planning

## File

- [plans/_planning.md](../plans/_planning.md) — todos grouped by dependency chains, sorted into 3 tiers, with token estimates.

## Tiers

1. **In Progress** — chains where the parent is done but the next child hasn't started. Pick from here first; these unblock work already underway.
2. **Available** — chain heads (parent not started) and fully independent tasks.
3. **Optional** — nice-to-have polish, no blockers, low urgency. Pick only if Tiers 1–2 are empty or the user asks for low-effort work.

## Chains vs independent

- **Chain**: tasks with a real dependency. Listed in order; only the head is startable until it lands.
- **Independent**: no dependencies; can be picked any time.
- Each chain shows its summed cost next to the chain name — just the K number (e.g. `**90K**`), no "total" word, no model label.
- The **Independent** section and each tier show their summed cost the same way, even when the section mixes models.
- The **Chains** subsection shows the sum of all chain totals next to its header.
- **Each tier header** shows its own total (Tier 1, Tier 2, Tier 3) — Tier 2 = Chains + Independent.
- One **Grand total** heading at the top, before Tier 1, formatted the same way as tier headers: `## Grand total — **NK**`. Sums every tier (Tier 1 + Tier 2 + Tier 3).

## How to start planning a new feature

**Trigger:** user describes a new feature/task that isn't in `memory/todo.md` or `_planning.md` yet.

Steps:

1. **Check `memory/todo.md` and `_planning.md` first** — if a matching plan already exists, surface it instead of creating a duplicate.
2. **Propose a model for the planning session itself** per [rules/models.md](models.md) — design work usually wants Sonnet/Opus. Wait for the user to switch (`/model`) before drafting.
3. Create the plan file in `plans/<feature-slug>.md` per [rules/todo.md](todo.md) → "Plan Files".
4. When the plan is considered finished, follow "How to create a planning entry" below — estimate cost, pick best-fit *implementation* model, add to `memory/todo.md` and `_planning.md`.

## Before implementing a task

**Trigger:** user asks to implement, build, or work on something.

Steps:

1. **Read `memory/todo.md` and `_planning.md` first** to see if an entry already exists. If yes, use that plan; do not start a parallel one.
2. If the request matches an existing entry, propose switching to the **preferred model** shown in brackets in `_planning.md`. Wait for the user to switch before coding.
3. If no entry exists and the work is non-trivial, treat this as planning a new feature (see above) instead of jumping straight to code.

## Selection rule

When the user asks to "work on todo", "pick next task", "what's next", or similar:

1. Read [plans/_planning.md](../plans/_planning.md) **before** `memory/todo.md`.
2. Pick by tier: Tier 1 → Tier 2 → Tier 3.
3. Within Tier 2, prefer chain heads over independent tasks (unblocks future work).
4. Match task token cost to the active model's budget (see "Estimating token cost" below).
5. Propose the chosen task (one line + plan link + K cost) and wait for user confirmation before starting.

## How to create a planning entry

**Trigger:** any time a new plan file is finished under `plans/`. Do this together with adding the entry to `memory/todo.md` (see [rules/todo.md](todo.md)) so both files stay in sync.

Steps:

1. Estimate the task's token cost and pick the best-fit model (see "How to estimate token cost" below). Format: `NK (Haiku|Sonnet|Opus)`.
2. Add a one-line entry to `_planning.md` linking to the plan file, with the cost + model.
3. Decide placement:
   - **Has a dependency on another active plan?** → put it in that chain, after its parent. Recompute the chain total.
   - **Independent and ready?** → Tier 2 → Independent.
   - **Polish/low-urgency?** → Tier 3.
4. If it forms a new chain (≥ 2 dependent tasks), create a chain block with a name and total.
5. Propose the entry + placement to the user and wait for confirmation before editing.
6. Keep entries terse — task name + `NK (Model)` only. The plan file holds the description.
7. **Recompute every affected total on every change.** Any add, remove, or estimate edit cascades up:
   - the chain or section the task belongs to
   - the **Chains** subsection sum (if a chain changed)
   - the **tier header** total (Tier 1/2/3)
   - the **Grand total** at the top (always)
   Format: just the bold K next to the section name (e.g. `— **90K**`), no "total" word, no model label.

## How to estimate token cost

**Cost unit: K (thousands of tokens), referenced against Haiku's 44K / 5h limit.**

For each task, pick the **good-enough model** for the work, estimate the cost **for that model**, and put the model name in brackets next to the K value:

- **Haiku** — mechanical edits, copy changes, simple components, config tweaks → e.g. `8K (Haiku)`
- **Sonnet** — multi-file features, schema + endpoint + UI, design judgment → e.g. `25K (Sonnet)`
- **Opus** — rare; deep architectural work or cross-cutting redesigns → e.g. `40K (Opus)`

The K value is in that model's own tokens. Compare Haiku tasks against the **44K / 5h** Haiku limit; Sonnet/Opus tasks against their own session budget.

Always include the model name in brackets — no implicit defaults.

**Procedure** (rough first-pass):
1. Skim the plan file's Steps + Current state.
2. Count rough surface area: how many files touched, new endpoints, new components, migrations, tests.
3. Map to a band:
   - **3–8K** — single-file edit, copy change, one new small component, config tweak
   - **10–20K** — one feature touching 2–4 files (frontend or backend)
   - **20–30K** — full-stack feature, schema change + endpoint + UI
   - **30–40K+** — multi-domain work, new script with external API, complex UI + data flow
4. Round to a clean K number.

**Refinement** (when accuracy matters): run a Haiku pass over the actual plan file. Use the Agent tool with a Haiku subagent to read the plan and produce a tighter estimate.

**Budget guidance:**
- ≤ 15K → fits comfortably in a Haiku session
- 15–25K → focused single Haiku session, no detours
- > 25K → split the task or run on Sonnet
- Chain totals > 44K → cannot complete the chain in one Haiku session; expect multiple

## Maintenance

- When a chain parent is completed, **promote its child** from Tier 2 to Tier 1.
- When a child has no remaining dependencies, **flatten its chain** (move to Independent).
- When a task is added to `memory/todo.md`, also add it to `_planning.md`.

## How to remove a planning entry

**Triggers:** task completed, dropped (no longer planned), or merged into another plan.

Steps:

1. Confirm with the user before deleting (unless the task is being completed as part of the current session and the user already confirmed the cleanup per [rules/todo.md](todo.md)).
2. Remove the entry from `_planning.md`.
3. Also remove the matching line from `memory/todo.md` and delete the plan file from `plans/` per [rules/todo.md](todo.md).
4. **If the deleted task was a chain parent**, promote its child to chain head (or flatten the chain to Independent if only one task remains).
5. **Cascade totals up** (same as add):
   - the chain or section it belonged to
   - the **Chains** subsection sum (if a chain changed)
   - the **tier header** total
   - the **Grand total** at the top
6. If a chain or section now has zero entries, remove its header.
