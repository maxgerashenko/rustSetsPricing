# Model Selection

Pick the model that matches the task's scope and complexity.

## Which model for which task

- **Opus** — planning and large UI work
  - Architecture and implementation plans
  - New views / pages / large component trees
  - Multi-step refactors that need design decisions

- **Sonnet** — feature work across files or domains
  - Features touching both `src/` and `server/`
  - Changes spanning several components or modules
  - Non-trivial logic that crosses boundaries (API ↔ UI, state ↔ view)

- **Haiku** — single-file adjustments, git, and file operations
  - CSS tweaks, template edits
  - Small helpers / utilities (not features)
  - Renames, copy changes, isolated bug fixes contained to one file
  - Git commands (status, commit, push, branching)
  - File reads/writes, directory operations

## Confirmation rule

Before starting **each new task**, confirm the active model matches the task type per the table above. If it does not, stop and ask the user to switch models (`/model`) before proceeding. Do not begin implementation until the model is confirmed.
