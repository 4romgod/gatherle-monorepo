---

## BUG-00X: Missing Token in Apollo Context Causes Incorrect User-Specific Fields

**Date Discovered:** January 21, 2026  
**Severity:** Medium  
**Status:** 🚩 Open

### Symptoms

- Fields like `isSavedByMe`, `isRsvpedByMe`, or other user-context-dependent attributes are always false or missing, even when the user is authenticated.
- UI does not reflect the user's actual state for events, organizations, etc.
- Some queries (e.g., get all events) do not show personalized data.

### Root Cause

When making Apollo Client queries that return context-based fields, the user's token must be passed in the context (usually via headers). If the token is omitted, the backend cannot resolve user-specific fields, leading to incorrect or missing data in the response.

#### Example (broken):

```typescript
const { data } = useQuery(GetAllEventsDocument, {
  variables: { options: {} },
  // context: { headers: getAuthHeader(token) }  // <-- missing!
});
```

#### Example (correct):

```typescript
const { data } = useQuery(GetAllEventsDocument, {
  variables: { options: {} },
  context: { headers: getAuthHeader(token) }
});
```

### Resolution

- Always pass the user's token in the Apollo context for queries/mutations that return user-specific or context-dependent fields.
- Use a utility (e.g., `getAuthHeader`) to inject the token from the session into the Apollo context for all relevant queries.

### Prevention

- Review all data-fetching hooks/components to ensure the token is included where needed.
- Consider centralizing Apollo Client setup or using a custom hook to always attach the token when available.
# Bugs Discovered & Fixed

This document tracks bugs discovered during development and testing, along with their root causes and fixes. It serves
as a knowledge base to prevent similar issues in the future.

---

## BUG-001: Event Participants Not Loading on Detail Page

**Date Discovered:** January 19, 2026  
**Severity:** High  
**Status:** ✅ Fixed

### Symptoms

- Event detail page (`/events/[slug]`) showed "No RSVPs yet" even when RSVPs existed
- Participant count was always 0 in the sidebar
- The same events showed correct participant counts on the event listing page

### Root Cause

The `readEventBySlug` and `readEventById` DAO methods used simple `findOne()` / `findById()` queries, which do **not**
include the `$lookup` aggregation pipeline.

The `participants` field on the `Event` type is a **virtual field** (not stored in the Event document) that gets
populated via `$lookup` from the `EventParticipant` collection. Without the aggregation pipeline, this field was always
empty.

```typescript
// BEFORE (broken) - No aggregation, participants empty
static async readEventBySlug(slug: string): Promise<EventEntity> {
  const event = await EventModel.findOne({slug}).exec();
  return event.toObject();  // participants = undefined
}
```

Meanwhile, `readEvents` (list query) correctly used the aggregation pipeline:

```typescript
// readEvents used pipeline - worked correctly
const pipeline = transformEventOptionsToPipeline(options); // includes $lookup
const events = await EventModel.aggregate(pipeline).exec();
```

### Fix

Updated `readEventById` and `readEventBySlug` to use aggregation with `createEventLookupStages()`:

```typescript
// AFTER (fixed)
static async readEventBySlug(slug: string): Promise<EventEntity> {
  const pipeline = [
    {$match: {slug: slug}},
    ...createEventLookupStages(),  // Includes $lookup for participants
  ];
  const events = await EventModel.aggregate<EventEntity>(pipeline).exec();
  return events[0];
}
```

Additionally, added a **field resolver fallback** for `participants` to handle mutation responses:

```typescript
@FieldResolver(() => [EventParticipant], {nullable: true})
async participants(@Root() event: Event, @Ctx() context: ServerContext) {
  // If already populated (from aggregation), return as-is
  if (event.participants?.[0]?.participantId) {
    return event.participants;
  }
  // Fallback: fetch from EventParticipant collection
  return EventParticipantDAO.readByEvent(event.eventId);
}
```

### Files Changed

- `apps/api/lib/mongodb/dao/events.ts` - Updated `readEventById` and `readEventBySlug`
- `apps/api/lib/graphql/resolvers/event.ts` - Added `participants` field resolver
- `apps/api/test/unit/spec/mongodb/dao/event.test.ts` - Updated tests

### Lessons Learned

1. Virtual/resolved fields (like `participants`) require consistent resolution strategy across all query paths
2. Document which fields are stored vs resolved in the data model docs
3. When adding new virtual fields, ensure all DAO methods that return the parent entity handle them consistently

---

## BUG-002: RSVP Notifications Missing Status Specificity

**Date Discovered:** January 19, 2026  
**Severity:** Low  
**Status:** ✅ Fixed

### Symptoms

- When users RSVP'd to events, followers received generic notifications like "John RSVPd to Event"
- Notifications didn't specify whether the user marked "Going" or "Interested"
- Made it harder for users to gauge actual attendance interest

### Root Cause

The `NotificationService.notifyMany()` method for `EVENT_RSVP` notifications didn't receive or use the participant's
RSVP status. The template generated a generic message regardless of whether the user was "Going", "Interested", or
"Waitlisted".

```typescript
// BEFORE - Generic message
case NotificationType.EVENT_RSVP:
  return {
    title: 'New RSVP',
    message: `${actorName} RSVPd to ${params.eventName}`,  // No status info
  };
```

### Fix

Updated the notification system to accept and use `rsvpStatus`:

```typescript
// NotifyParams interface
interface NotifyParams {
  // ... existing fields
  rsvpStatus?: ParticipantStatus;  // Added
}

// Template now uses status
case NotificationType.EVENT_RSVP:
  let rsvpAction: string;
  switch (params.rsvpStatus) {
    case ParticipantStatus.Going:
    case ParticipantStatus.CheckedIn:
      rsvpAction = 'is going to';
      break;
    case ParticipantStatus.Interested:
      rsvpAction = 'is interested in';
      break;
    case ParticipantStatus.Waitlisted:
      rsvpAction = 'joined the waitlist for';
      break;
    default:
      rsvpAction = 'RSVPd to';
  }
  return {
    title: 'Event RSVP',
    message: `${actorName} ${rsvpAction} ${params.eventName}`,
  };
```

Updated `EventParticipantService.rsvpToEvent()` to pass the status:

```typescript
await NotificationService.notifyMany({
  // ...
  rsvpStatus: status, // Now included
});
```

### Files Changed

- `apps/api/lib/services/notification.ts` - Added `rsvpStatus` to params and template
- `apps/api/lib/services/eventParticipant.ts` - Pass status to notification
- `apps/api/test/unit/spec/services/notification.test.ts` - Added status-specific tests

### Lessons Learned

1. Notifications should be specific and actionable
2. When capturing user RSVP status (Going vs Interested), propagate that context through the entire flow

---

## BUG-003: Next.js Page Caching Stale Event Data

**Date Discovered:** January 19, 2026  
**Severity:** Medium  
**Status:** ✅ Fixed

### Symptoms

- After RSVPing to an event, refreshing the page still showed old participant count
- Users had to hard-refresh or wait for cache invalidation
- Inconsistent UX between RSVP action and displayed state

### Root Cause

The event detail page was a Next.js Server Component without `dynamic = 'force-dynamic'`. Next.js was caching the page
at the route level, even though the Apollo Client had `fetchPolicy: 'no-cache'`.

### Fix

Added route segment config to force dynamic rendering:

```typescript
// apps/webapp/app/events/[slug]/page.tsx
export const dynamic = 'force-dynamic'; // Added
```

### Files Changed

- `apps/webapp/app/events/[slug]/page.tsx`

### Lessons Learned

1. Apollo `fetchPolicy` doesn't override Next.js route-level caching
2. Pages with user-specific or frequently-changing data need `dynamic = 'force-dynamic'`
3. Consider ISR with short revalidation times as an alternative for high-traffic pages

---

## Template for New Bugs

```markdown
## BUG-XXX: [Title]

**Date Discovered:** [Date]  
**Severity:** High | Medium | Low  
**Status:** 🔴 Open | 🟡 In Progress | ✅ Fixed

### Symptoms

- [What the user/developer observed]

### Root Cause

[Technical explanation of why the bug occurred]

### Fix

[Code changes and reasoning]

### Files Changed

- [List of files modified]

### Lessons Learned

1. [Takeaway to prevent similar bugs]
```
