## Workflow

1. Read [docs/project-state.md](../../docs/project-state.md) in full.

2. **Determine which task to close**, in this order of precedence:
   - If the user passed an argument (e.g. `/done-task WEB-002`), use that task ID.
   - Otherwise, read "Current focus" from the status header. If set, confirm with the user: _"Mark [ID — Title] as
     Done?"_
   - If "Current focus" is empty and no argument was provided, list all tasks with Status `In Progress` from both
     backlogs and ask the user which one to close.

3. **On confirmation**, apply all four updates to `docs/project-state.md`:
   - **Backlog row**: change Status → `Done`
   - **MVP Feature Checklist**: if the completed task maps to a checklist feature row, update its API or Webapp column
     to ✅ Done (or note partial if only one side is done)
   - **Header "Current focus"**: clear it (set to `_(update this when you pick up a task)_`)
   - **Header "Last updated"**: set to today's date

4. **Immediately suggest the next task** — run the same logic as `/new-task`:
   - Collect all `Backlog` / `Ready` tasks from both backlogs
   - Present grouped by priority (P0 → P1 → P2 → P3), each with ID, title, area, and a one-sentence rationale
   - Ask the user to pick one by number or ID (and if they do, update project-state.md to mark it `In Progress` and set
     "Current focus")
