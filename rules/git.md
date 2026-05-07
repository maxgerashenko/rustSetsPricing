# Git Rules

## Commits

- **Never** add `Co-Authored-By: Claude` or any AI co-author line to commit messages
- Write commit messages in imperative mood: "Add trash icon", not "Added trash icon"
- Subject line: short and specific — describe what changed, not why
- One logical change per commit; don't bundle unrelated edits

## Branching

- Feature work goes on a named branch, not directly on `main`
- Branch names use kebab-case: `sets-count-bar`, `price-trend`

## When to commit

- Commit after each self-contained unit of work (a feature step, a bug fix, a refactor)
- Do not commit broken or half-finished code
- Stage specific files — avoid `git add -A` to prevent accidental inclusion of `.env` or build artifacts

## Planning sync

After committing a completed task, remove it from `plans/_planning.md` and update the token totals per [rules/todo.md](todo.md) cleanup rules.
