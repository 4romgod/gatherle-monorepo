# Frontend Query Parity

This document tracks the current parity strategy for `apps/mobile` and `apps/webapp`.

The target is:

- same backend contracts
- same query intent
- same hook names and return shapes where practical
- different UI components only when platform rendering genuinely differs

## Current Rules

1. Prefer dedicated server-filtered queries over fetching broad collections and filtering client-side.
2. When mobile and web render the same logical collection, create matching hooks on both surfaces.
3. Keep non-UI query builders and event-time partition helpers mirrored in both frontends, but do not import runtime
   helpers from `@gatherle/commons` into either frontend surface.
4. Use the mobile app and the mobile-sized webapp as the default parity pair.

## Phase 1: Account/Profile/Event Collections

Shared utilities:

- `buildHostedEventsQueryOptions`
- `splitItemsByEventTime`
- `sortItemsByEventTime`

Location:

- mobile: `apps/mobile/src/lib/events/eventCollections.ts`
- web: `apps/webapp/lib/utils/eventCollections.ts`

Aligned hooks:

- mobile: `src/hooks/events/useHostedEventsByUser.ts`
- web: `hooks/useHostedEventsByUser.ts`

- mobile: `src/hooks/events/useMyEventOccurrenceRsvps.ts`
- web: `hooks/useMyEventOccurrenceRsvps.ts`

- mobile: `src/hooks/events/useSavedEvents.ts`
- web: `hooks/useSavedEvents.ts`

- mobile: `src/hooks/events/useUserEventOccurrences.ts`
- web: `hooks/useUserEventOccurrences.ts`

Refactored surfaces:

- mobile `AccountScreen`
- mobile `MyEventsScreen`
- mobile `UserProfileScreen`
- web `UserProfilePageClient`
- web `UpcomingRsvpsSection`

## Remaining High-Drift Domains

### Discovery / Home

Mobile still uses a dedicated `Discovery` query surface, while web composes home/feed data from several route-local
sections.

Next target:

- define matching collection hooks for:
  - upcoming occurrences
  - trending/recommended events
  - category rail data
  - organization rail data

### Notifications

Notification loading and section shaping are still surface-specific.

Next target:

- create matching notification list hooks
- normalize unread-count behavior
- centralize pagination and refetch policy

### Organizations / Venues

List and detail pages still differ in query field coverage and filtering conventions.

Next target:

- match list/detail query field sets
- centralize common query-option builders
- align “load more” semantics

### Chat / Messages

Realtime/thread loading patterns still differ materially across web and mobile.

Next target:

- align thread-list hooks
- align thread detail/message pagination hooks
- document intentional transport/runtime differences separately from data-shape differences

## Review Checklist

Before adding a new frontend query flow:

1. Does the other surface already fetch the same logical data?
2. Can this be expressed as a matching hook name on both platforms?
3. Can option-building or time-partition logic be mirrored cleanly in both frontends without importing runtime helpers
   from `@gatherle/commons`?
4. Are we overfetching and filtering in the client when the API can filter directly?
