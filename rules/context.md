# Context Rules

Before starting work, establish context:

1. **Check TODO List** — Review `memory/` or the current task list to understand what's been completed and what's in progress. This ensures continuity and prevents duplicating work.

2. **Read Last Class Name** — Check recent commits or memory for the last modified class/component to understand the current working area and recent patterns.

These checks take 30 seconds and prevent context switching errors.

## Marking Work as Done

When deciding whether to mark a task as done in the TODO:

- **System design or user flow changes**: Always mark as done if completed (even if not originally in TODO). These are significant.
- **Feature additions**: Mark as done if it was a tracked task
- **Bug fixes**: 
  - Mark as done if the bug was tracked in TODO
  - Don't mark as done for incidental bug fixes found during other work
- **Minor/trivial changes** (typos, formatting, small refactors): Don't mark done unless explicitly tracked

**Rule**: Mark "done" for system design/user flow changes regardless of whether they were tracked. For other work, only mark done if it was explicitly in the TODO list.
