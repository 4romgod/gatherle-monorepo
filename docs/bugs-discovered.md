---

## BUG-00X: Missing Token in Apollo Context Causes Incorrect User-Specific Fields

**Date Discovered:** January 21, 2026  
**Severity:** Medium  
**Status:** ✅ Fixed

### Symptoms

- Fields like `isSavedByMe`, `isRsvpedByMe`, or other user-context-dependent attributes are always false or missing, even when the user is authenticated.
- UI does not reflect the user's actual state for events, organizations, etc.
- Some queries (e.g., get all events) do not show personalized data.

### Root Cause

Neither `apollo-client.ts` (server RSC) nor `apollo-wrapper.tsx` (client) has an auth link in the Apollo link chain. Auth is passed **per-call** via `context: { headers: getAuthHeader(token) }`. Components that forget to pass the auth context make unauthenticated requests, returning `false` for all user-specific resolver fields.

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

### Fix

Audited all 53 `useQuery`/`useMutation` calls across the webapp. Found one genuinely missing auth context:

- **`apps/webapp/components/account/UserEventsList.tsx`** — `GetAllEventsDocument` (line 28) had no `context` option. Added `context: { headers: getAuthHeader(token) }`.

All other components that query fields like `isSavedByMe`, `isRsvpedByMe`, `myRsvp`, and `isFollowedByMe` already pass auth context correctly via `useSession` + `getAuthHeader`.

### Prevention

- Every component that calls `useQuery`/`useMutation` for queries including user-specific fields (`isSavedByMe`, `isRsvpedByMe`, `myRsvp`, `isFollowedByMe`) must pass `context: { headers: getAuthHeader(token) }`.
- Public-data queries (venues list, categories, users list) do not need auth context.
- Consider adding an `authLink` to `apollo-wrapper.tsx` in the future to make auth automatic for all client-side requests.
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

## BUG-004: S3 Upload / DB Moment Race Condition — Video Moments Can Fail To Become Ready

**Date Discovered:** 19 April 2026 **Severity:** High **Status:** ✅ Fixed

### Symptoms

- A video moment is uploaded and MediaConvert completes successfully, but the moment document remains pending
  indefinitely with no ready `mediaUrl`.
- No error surfaces to the user — the moment ring shows a spinner that never resolves.
- The bug is silent: `onTranscodeEvent` logs success even though no DB update occurred.

### Root Cause

`EventMomentComposer` uploads the raw video file to S3 first (line 300), then calls `createEventMoment` later (line 348)
after the upload completes. For short videos on fast connections, MediaConvert can pick up the S3 object, transcode it,
and fire the EventBridge completion event before `createEventMoment` has written the `EventMoment` document to MongoDB.
`onTranscodeEvent` looks up the moment by `mediaUrl` (line 65); finding nothing, it returns success at line 68.
EventBridge marks the invocation as successful and will not retry. The moment document is created after the fact with no
mechanism to trigger a second transcode or completion handler pass.

### Implemented Fix

Implemented API-033 with the bounded retry path:

- `onTranscodeEvent` now throws when a MediaConvert terminal event has a `rawS3Key` but no matching `EventMoment`
  document is found by raw media URL.
- The MediaConvert EventBridge target retries the Lambda up to 3 times within a 5-minute event age window.
- Persistent misses are sent to an SQS DLQ for inspection instead of being silently acknowledged.

This kept the previous client flow intact while preventing a fast MediaConvert completion from permanently stranding a
later-created moment in a pending state.

### Alternative Future Fix

- **Option A (preferred):** Create the `EventMoment` document (or a lightweight upload session) _before_ issuing the S3
  PUT, storing the expected raw S3 key. Embed the `momentId` in the S3 object key or in the MediaConvert `UserMetadata`.
  `onTranscodeEvent` then looks up by `momentId`/key rather than `mediaUrl`, and the race is eliminated.

### Tracked In

- API-033 in `docs/project-state.md` — Done

---

## BUG-005: 30-Second / 75 MB Video Limits Are Client-Only (Docs Claim Server Enforcement)

**Date Discovered:** 19 April 2026 **Severity:** High **Status:** ✅ Fixed (API-034)

### Symptoms

- A user can upload a video longer than 30 seconds or larger than 75 MB and the server accepts it, triggering a
  full-cost MediaConvert job with no rejection.
- The feature docs (`docs/features/event-moments.md`) state that these limits are enforced server-side, which is
  incorrect.

### Root Cause

- `CreateEventMomentInput` (`packages/commons/lib/types/eventMoment.ts` line 116) has no `duration` field.
- The Zod validation schema (`apps/api/lib/validation/zod/social.ts` line 59) only validates `mediaKey` presence; no
  size or duration check exists.
- `onTranscodeEvent` marks any completed MediaConvert output `Ready` (line 81) regardless of the actual duration or file
  size of the output.
- Client-side checks in the composer (duration ≤ 30 s, file size ≤ 75 MB) are the only enforcement layer.

### Implemented Fix

- **`createEventMoment`:** Verifies the uploaded video's S3 `ContentLength` before publishing a video moment, rejecting
  missing, unverifiable, or > 75 MB raw objects so rejected uploads do not become permanently pending moments.
- **`startTranscodeJob`:** Reads `event.detail.object.size` from the EventBridge payload. If size is missing or exceeds
  75 MB, it skips MediaConvert, marks the matching reserved moment Failed when present, and deletes the raw S3 object.
- **`startTranscodeJob` HLS output:** Writes HLS output to a per-upload prefix (`{raw-key-without-ext}/hls/`) so cleanup
  for one rejected video cannot delete another moment's HLS files.
- **`onTranscodeEvent`:** Parses duration from MediaConvert `OutputGroupDetails`. If duration is missing or exceeds 30
  s, it calls `EventMomentDAO.markFailed` and deletes both the raw object and that upload's HLS prefix.

### Tracked In

- API-034 in `docs/project-state.md`

---

## BUG-006: Video Moment Progress Bar Completes Before Video Finishes

**Date Discovered:** April 2026  
**Severity:** Medium  
**Status:** ✅ Fixed

### Symptoms

- When viewing video moments in `EventMomentViewer`, the story progress bar filled to 100% before the video actually
  ended.
- The progress bar should track `video.currentTime / video.duration` in real time, not run on a fixed-rate rAF timer.

### Root Cause

`EventMomentViewer` uses a `requestAnimationFrame` (rAF) timer to advance the progress bar for image/text moments at a
fixed rate. For video moments, this rAF timer must be suppressed so that only the `timeupdate` event drives progress via
`handleVideoTimeUpdate`.

The suppression check compared `momentTypeRef.current` against the lowercase string `'video'`, but the Apollo client
received `EventMomentType` values from TypeGraphQL in PascalCase (`"Video"`), matching the generated
`EventMomentType.Video = 'Video'` (codegen maps GraphQL enum names, not TypeScript values).

```typescript
// BEFORE (broken) — exact-match comparison failed for PascalCase wire value
if (momentTypeRef.current === 'video') {
  // 'Video' !== 'video' → RAF not suppressed
  rafRef.current = null;
  return;
}
```

TypeScript enum value in commons: `Video = 'video'` (lowercase, DB storage)  
GraphQL wire format from TypeGraphQL: `"Video"` (PascalCase, enum key name)  
Codegen generated type: `EventMomentType.Video = 'Video'` (matches wire format)

### Fix

`.toLowerCase()` normalization was added to all critical comparison paths in `EventMomentViewer.tsx`:

- **Line 256**: `momentTypeRef.current?.toLowerCase() === 'video'` — RAF timer suppression ✅
- **Line 261**: `momentTypeRef.current?.toLowerCase() === 'image'` — RAF early-exit for loading images ✅
- **Line 248**: `moment?.type?.toLowerCase() === 'video'` — `isVideoMoment` flag ✅
- **Line 293**: `moment?.type?.toLowerCase() === 'video'` — HLS video source resolution ✅

Render-section comparisons (`moment.type === EventMomentType.Video`) use the codegen enum value `'Video'` which
correctly matches the API wire format — no change needed there.

### Files Changed

- `apps/webapp/components/eventMoments/EventMomentViewer.tsx` — added `.toLowerCase()` at RAF/HLS check sites

### Lessons Learned

- TypeGraphQL serializes enum values using the **GraphQL enum key name** (PascalCase), not the TypeScript value
  (lowercase). Always check generated codegen types, not raw TypeScript enum values, when comparing GraphQL response
  data.
- When a TypeScript enum uses lowercase values for DB storage but GraphQL serializes as PascalCase, either normalize on
  comparison (`.toLowerCase()`) or align all layers to use the same casing.

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
