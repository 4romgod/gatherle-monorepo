# Session state persistence proposal

## Why this matters

Refreshing a page today discards the tab the user was on, any partially filled form data, and other UI choices that are
valuable context for the next visit. Persisting the _right_ subset of client-side state keeps power users productive,
reduces accidental data loss, and can later be extended to **support cross-device continuity**.

## Candidate pieces of state to save

1. **Selected tab (especially admin console tabs & account settings tabs)** – losing the current tab forces the user to
   scroll back to the same section after every reload.
2. **Draft event data** – the most painful experience is writing a long event form and accidentally refreshing. Saving
   the form state (either per field or as the entire payload) prevents retyping.
3. **Filters/search/scroll positions in heavy lists (events list, category explorer)** – these are lower priority but
   worth capturing once we have the infrastructure.
4. **Any modal/dialog state where closing/reloading loses progress** (e.g., multi-step admin actions).

## Requirements

- Persistence should survive a full page reload but not necessarily a logout (sensitive data must not linger).
- It must work in the client-only forms/context (admin tabs and account settings pages already run in the browser).
- Storage should be scoped per user and namespace to avoid cross-user leakage in shared browsers (use combined keys
  e.g., `ntlango:sessionstate:account-events-tab:<userId>`).
- Provide a way to clear stale drafts (e.g., “Discard draft” button on the event form) and automatically expire data
  after a configurable duration.
- Minimal impact on bundle size/performance. We already ship MUI/Tailwind; adding a small helper hook is acceptable.

## Implementation options

| Option                                                 | Pros                                                                          | Cons                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `localStorage` with custom hook (`usePersistentState`) | Simple, synchronous, no extra dependencies, works across reloads              | Requires serialization/guarding for server-side renders; no built-in expiration          |
| `sessionStorage`                                       | Same API as localStorage but clears on tab close (safer for sensitive drafts) | Users expect persistence across browser restarts; session storage would drop data        |
| IndexedDB (via wrapper like `idb-keyval`)              | Can handle larger payloads, async, can store structured data                  | More complex, async plumbing, overkill for small state                                   |
| Cookies                                                | Automatically scoped and can set expirations                                  | Not ideal for per-component state, limited size (~4kb)                                   |
| Server-side persistence (features table)               | Works across devices and browsers                                             | Introduces backend read/write complexity, requires schema + migration, increases latency |

## Proposed approach

1. **Start with a lightweight `usePersistentState` hook (backed by `localStorage`).**
   - Hook accepts a key, default value, and options like `ttl` and `storageType` (`localStorage` vs `sessionStorage`).
   - Handles hydration guard (no `window` references during SSR) and JSON serialization/deserialization.
   - Automatically namespaces keys with the user ID when provided.
2. **Apply the hook for tab state.**
   - Wrap `CustomTabs` with a prop that stores the selected tab index/key; on mount read from `localStorage`, on change
     persist.
   - Admin console and account settings pages can pass the same hook via `tabsProps`.
3. **Use the hook around the event creation/edit form.**
   - Persist the entire form payload as the user types.
   - Add a “Discard draft” control (or auto-clear after successful submit).
   - Consider throttling updates to avoid excessive writes (e.g., `useDebouncedCallback`).
4. **Future expansions**
   - Once the hook is reliable, extend to filters or other panels.
   - Potentially add a global “draft manager” UI that lists saved drafts.
5. **Cleanup & boundaries**
   - Clear stored drafts when the user explicitly resets the form, navigates away after submission, or logs out.
   - Provide a dev helper to inspect stored keys (optional, but helpful during testing).

## Next steps

1. Implement `usePersistentState` in `apps/webapp/hooks/` or `utils` with tests covering serialization/expiration.
2. Update `CustomTabs` to accept optional persistence config (key + default index) and persist the selected tab.
3. Wrap the event mutation form state in the new hook, add UI for clearing drafts, and ensure that submit clears the
   storage entry.
4. Review other high-impact areas (filters, dialog state) and expand once the pattern proves stable.
5. Document the preserved keys/pattern in `docs/session-state-plan.md` plus any new README additions for future
   contributors.

---

## Features that depend on session state

### Cross-device continuity

- Once the client-side persistence proves reliable, we can sync a subset of the saved state (tab selection, active
  draft, filters) to the backend so the user sees the same state across devices.
- Implement this by having the persistence hook optionally call a GraphQL mutation (or REST endpoint) that stores the
  serialized state in a user-specific record (e.g., `UserPreference` or `UserSessionState`).
- Only sync non-sensitive data, respect privacy (no auth tokens), and version the payload so we can evolve the schema
  without breaking older stored states.
- On hydration, read from the server first (if available), fall back to `localStorage`, and write through the hook when
  the user changes the state again.
- Provide a migration/clear path so stale or corrupted server-side state can be reset without impacting the local draft.

### Location-based onboarding

- When a new visitor lands on the site, we can ask for browser geolocation permission and, if granted, save the
  coordinates + consent flag via the persistence hook so we can apply location filters for future sessions without
  re-prompting.
- Store a `(permissionGranted, { latitude, longitude })` tuple alongside other session state keys so we know whether to
  auto-apply `EventsQueryOptionsInput.location` when building the initial feed (the backend already supports this via
  `createLocationMatchStage`).
- If the user denies permission, persist that decision and keep showing the global (non-location-filtered) view, but
  surface a “Enable location discovery” CTA later so they can grant access and reset the saved preference.
- Treat the stored location as non-sensitive (no auth tokens); clear it when the user explicitly signs out or revokes
  the preference. Include a UI affordance to “Forget my location” so the hook can drop the entry and re-prompt on next
  visit.
