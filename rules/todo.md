# TODO Management

## File Locations

- Active tasks: [memory/todo.md](../memory/todo.md)
- Completed history: [memory/done.md](../memory/done.md)
- Per-feature plans: [memory/plans/](../memory/plans/)

## Plan Files (one per feature)

Every non-trivial feature/task gets its own plan file in `memory/plans/<feature-slug>.md`. The entry in `memory/todo.md` should be a single line linking to the plan, not an inline checklist.

**Plan file should contain:**
- **Goal** — one-sentence description of what the feature does
- **Current state** — what exists, what's missing (with file:line refs)
- **Steps** — concrete implementation steps with code snippets where helpful
- **Out of scope** — explicit list of what's NOT being built (defer items)
- **Recommended model** — which model fits per [rules/models.md](models.md)

**When to create a plan file:**
- Feature spans multiple files or domains
- Task requires design decisions
- Work will take more than one short session

**When NOT to create one:**
- One-line CSS tweaks, typo fixes, config changes — keep these inline in `todo.md`

When the plan is fully implemented, move the plan file (or a summary of it) to `memory/done.md` per the cleanup rules below, and delete the plan file.

## Cleanup Rules

After completing work on a section in `memory/todo.md`:

1. **Move worth-keeping completions to `memory/done.md`** — append under the appropriate section (see "What to Record as Done" below)
2. **Delete completed items** from `memory/todo.md`
3. **Delete empty sections** in `memory/todo.md` — remove the section header if no tasks remain
4. **Keep only incomplete tasks** visible in `memory/todo.md`

## What to Record as Done

Only record completion of changes that are **important for future development context** — items that affect Claude's understanding of how the project works or is structured. Append these to `memory/done.md`.

### Include in Done
- New data structures or fields in the data flow
- Feature additions that change user-facing behavior
- User flow or navigation changes (new screens, new interactions)
- Architectural decisions or code organization changes

### Exclude from Done
- Cosmetic or layout tweaks (CSS, styling)
- Minor bug fixes without functional impact
- Internal refactoring that doesn't change behavior
- UI polish or visual adjustments

## Goal

Maintain a concise record of **functional and structural evolution** in `memory/done.md` that helps Claude understand the project, not a complete mirror of every change. `memory/todo.md` stays focused on remaining work only.
