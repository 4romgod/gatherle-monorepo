## Workflow

1. Read [docs/project-state.md](../../docs/project-state.md) in full.

2. Check "Current Focus" in the header — if a task is already `In Progress`, surface it first and ask whether to
   continue it or pick something new.

3. Collect all tasks with status `Backlog` or `Ready` from both backlogs.

4. If the user passed an argument, filter by it (e.g. `api`, `webapp`, `P1`).

5. Present tasks grouped by priority (P0 → P1 → P2 → P3), each with:
   - Number, ID, title, area (API/Webapp), priority
   - One-sentence rationale (why it matters for the MVP)

   Format example:

   ```
   **P0**
   1. [WEB-011] Resolve auth config secret exposure (Webapp) — NEXTAUTH_SECRET and API JWT_SECRET must be distinct before launch; a shared secret is a security risk.

   **P1**
   2. [WEB-002] Wire forgot-password API call (Webapp) — Core auth flow is broken for users who forget their password.
   3. [API-015] Implement sendMessage mutation (API) — Chat reads work but users cannot send messages; the page is effectively dead.
   ...
   ```

6. Ask the user to pick one by number or ID.

7. Once picked:
   - Update `docs/project-state.md`: change the task's Status → `In Progress`, set "Current focus" in the header to the
     task ID and title, update "Last updated" to today's date
   - Summarize the task in full: what needs to be done, relevant file paths from the backlog row, and any noted
     dependencies
   - Ask: "Ready to start? I can switch to implementation mode."
