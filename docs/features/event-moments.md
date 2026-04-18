# Event Moments — Feature Design

**Date:** 17 April 2026  
**Status:** 📋 Design / Pre-implementation  
**Feature:** Event-linked ephemeral statuses (text, image, short video)

---

## Overview

Event Moments are ephemeral posts — text, images, or short video clips — that an authenticated event attendee can
publish before, during, or after an event (within the posting window). Statuses are linked to a specific event and
expire automatically after **24 hours**. The display pattern mirrors WhatsApp Status / Instagram Stories: a ring of
circular avatar bubbles at the top of the event detail page.

**Visibility model:**

- **Event page ring** — shows statuses from **all attendees** who posted for that event, regardless of whether the
  viewer follows them. If you're on the event page you can see everyone's moment from that event.
- **Personal status feed** (home feed / dedicated stories feed) — shows only statuses from users the viewer follows.
  This is the curated, social-graph-filtered surface.
- **Direct profile / search view** — a viewer can navigate to any public user's profile and see that user's active
  statuses, even without following them. Users whose profile is set to private (`followPolicy: RequireApproval` and not
  yet followed by the caller) restrict their moments to accepted followers only.
- **Own statuses** — always visible to the author regardless of follow state.
- **Event organizers** — can see all statuses on their event for moderation purposes.

---

## Decisions & Rationale

### Who can post?

Only users who have an active RSVP to the event. Accepted RSVP statuses: **Going**, **CheckedIn**. `Interested` and
`Waitlisted` are excluded — those users have not committed to attending and allowing them to post would inflate the feed
with noise. `Cancelled` is explicitly disallowed server-side.

### When can you post? (Posting window)

Posting is allowed from the moment a user's RSVP is confirmed through to **48 hours after the event ends**.

```
 RSVP confirmed ──────────────────────────── event.endDate + 48h
      │                                              │
      ▼                                              ▼
  ┌────────────────────────────────────────────────────┐
  │ Pre-event hype  │  Live moments  │  Post-event recap│
  └────────────────────────────────────────────────────┘
```

**Why no hard start date?** Allowing posts from RSVP time lets attendees build pre-event hype organically — outfit
photos, travel shots, "so excited for this" text statuses. These drive discovery for followers who haven't RSVP'd yet.

**Why 48 hours post-event?** Recap content (highlight photos, group shots) is highest-engagement content for the event
page. Cutting off at 48 h prevents indefinite accumulation while giving attendees a full day and a half to share
memories. Each status still expires 24 hours after it is posted regardless.

The posting window is enforced server-side in `createEventMoment`: the resolver reads `event.endDate` and rejects
requests where `now > event.endDate + 48h`.

### How many statuses can a user post?

**5 statuses per rolling 24-hour window per event**, per user.

| Limit design                       | Assessment                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Flat per-event cap (e.g. 10 total) | Penalises early posters; awkward across a multi-day hype window                |
| 3 per rolling 24 h                 | Too restrictive for an active live event or a multi-day buildup                |
| **5 per rolling 24 h** ✅          | Allows natural burst activity (live moments) without spamming followers' feeds |
| Unlimited                          | Followers could be flooded; storage cost unbounded                             |

The rolling window is checked by counting documents in `event_moments` where `authorId = userId`, `eventId = eventId`,
and `createdAt > now - 24h`. If the count is ≥ 5, the resolver rejects with a user-facing rate-limit error.

### Who can see statuses?

Visibility depends on the surface:

- **Event page ring** — all moments for that event are visible to any authenticated viewer, regardless of follow
  relationships. The event context is shared, so everyone who lands on the event page can see all attendees' moments.
- **Personal status feed** — only statuses from users the viewer follows are surfaced here. This is the curated,
  social-graph-filtered experience (closer to WhatsApp's model).
- **Public user profile / search** — any authenticated user can view the statuses of a public-profile user directly,
  even without following them. Private-profile users restrict their moments to accepted followers only.
- **Own statuses** — always visible to the author.
- **Event organizer** — can see all statuses on their event for moderation purposes.

### 24-hour TTL

Statuses expire 24 hours after creation. Enforced by a MongoDB TTL index on `expiresAt`. The field is set at creation
time to `createdAt + 24h`. Expired documents are deleted by MongoDB's background TTL reaper — no cron job needed.

### Video clip length: **15 seconds**

| Option      | Notes                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **15 s** ✅ | Instagram Stories / TikTok loop cap — short enough that raw uploads stay small (~25–75 MB) and transcoding is fast; still enough to capture a meaningful moment |
| 30 s        | WhatsApp Video Status cap — more storage and transcoding cost per upload                                                                                        |
| 60 s        | Significantly more storage and transcoding cost per upload                                                                                                      |
| 90 s+       | Storage and transcoding cost jumps significantly; no clear UX benefit                                                                                           |

**Recommendation: 15 seconds max.** If the selected file exceeds 15 seconds, the client **truncates it to the first 15
seconds** (using the [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) or a
`<canvas>` + `<video>` seek-and-record approach) before the upload begins. The user sees a preview of the truncated clip
and a brief "Trimmed to 15 s" notice. The resolver also enforces the limit server-side via the `durationSeconds` field
as a safety net. The short cap also means we can serve a single 720p rendition without adaptive bitrate complexity — HLS
is still used for broad device compatibility but a second 360p rendition becomes optional.

### Video compression: Yes — server-side transcoding

Uploading raw phone video to S3 and serving it directly is not viable:

- A 15-second 4K clip from a modern phone is ~25–75 MB
- Different devices produce different codecs (H.264, H.265, ProRes, VP9)
- No adaptive bitrate → poor experience on slow connections

**Proposed approach: upload → transcode → HLS stream via CloudFront.**

```
Phone → Pre-signed PUT → S3 raw/ prefix
                              ↓
                   S3 Event Notification (ObjectCreated)
                              ↓
                   AWS Lambda (or MediaConvert job trigger)
                              ↓
                   AWS Elemental MediaConvert
                   (transcode to HLS: 360p / 720p renditions)
                              ↓
                   S3 processed/ prefix (HLS .m3u8 + .ts segments)
                              ↓
                   CloudFront → browser (adaptive bitrate)
```

After MediaConvert completes, a Lambda writes back the `hlsUrl` to the `EventMoment` document in MongoDB (via an
internal API call or direct Mongoose write in the Lambda). The client polls or receives a WebSocket push when the status
transitions from `Processing` to `Ready`.

**Image** statuses: same path as current avatar/featured image uploads — pre-signed PUT, then served via existing
CloudFront distribution. No transcoding needed.

**Text** statuses: no media — just stored in MongoDB.

### Streaming: HLS via CloudFront

HLS (HTTP Live Streaming) is the right choice because:

- Native support in all modern browsers (`<video>` + MSE) and all mobile OS
- Adaptive bitrate automatically downgrades quality on poor connections
- CloudFront caches `.m3u8` playlists and `.ts` segments at edge — scales to any viewer count with zero API involvement
- Standard enough that `hls.js` (5 KB gzip) handles desktop fallback

CloudFront already exists in the stack (`S3BucketStack`). HLS segments for processed media will be served through the
same distribution using a `/processed/` path prefix.

---

## Data Model

### `EventMoment` (new collection: `event_moments`)

```typescript
// packages/commons/lib/types/eventMoment.ts

export enum EventMomentType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
}

export enum EventMomentState {
  Processing = 'Processing', // video uploaded, awaiting transcode
  Ready = 'Ready', // visible to viewers
  Failed = 'Failed', // transcoding failed
}

@ObjectType('EventMoment')
@modelOptions({ schemaOptions: { timestamps: true } })
@index({ eventId: 1, authorId: 1 })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // MongoDB TTL index
export class EventMoment {
  @Field(() => ID)
  momentId: string; // uuid

  @Field(() => ID)
  eventId: string; // linked event

  @Field(() => ID)
  authorId: string; // userId of poster

  @Field(() => EventMomentType)
  type: EventMomentType;

  @Field(() => String, { nullable: true })
  caption?: string; // optional for all types; the text body for type=Text

  @Field(() => String, { nullable: true })
  mediaUrl?: string; // CF URL for image; HLS .m3u8 URL for video

  @Field(() => String, { nullable: true })
  thumbnailUrl?: string; // CF URL for video poster frame (generated by MediaConvert)

  @Field(() => EventMomentState)
  state: EventMomentState; // Processing | Ready | Failed

  @Field(() => Number, { nullable: true })
  durationSeconds?: number; // for video moments (stored after transcode)

  @Field(() => Date)
  expiresAt: Date; // createdAt + 24h — drives TTL index

  @Field(() => Date)
  createdAt: Date;

  // GraphQL-only field resolver
  @Field(() => User, { nullable: true })
  author?: User;
}
```

### MongoDB indexes

| Index                                           | Type     | Purpose                                              |
| ----------------------------------------------- | -------- | ---------------------------------------------------- |
| `{ eventId: 1, authorId: 1 }`                   | Compound | Fetch all moments for an event, or all by one author |
| `{ expiresAt: 1 }` with `expireAfterSeconds: 0` | TTL      | Auto-delete documents 24 h after creation            |
| `{ authorId: 1, createdAt: -1 }`                | Compound | Reverse-chronological feed for a followed user       |

---

## Authorization Rules

| Operation                                                     | Who can do it                                                                                                                                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEventMoment`                                           | Authenticated user with an active RSVP (`Going` or `CheckedIn`) to the event, within the posting window                                                                                            |
| `readEventMoments(eventId)` — event page                      | Any authenticated user — server returns **all** statuses for that event regardless of follow relationship. Visibility is scoped to the event context only.                                         |
| `readFollowedStatuses` — personal feed                        | Any authenticated user — server returns only statuses from authors the caller follows (across all events), plus the caller's own statuses.                                                         |
| `readUserEventMoments(userId, eventId)` — profile/search mode | Any authenticated user can read statuses from a **public** user (where `followPolicy: Public` or caller is an accepted follower). Private user statuses are restricted to accepted followers only. |
| `deleteEventMoment`                                           | Author of the status, or event organizer (Host / CoHost role)                                                                                                                                      |
| View `state: Processing`                                      | Author only — other viewers see nothing until `Ready`                                                                                                                                              |

**Privacy rule applied in the resolver:**

1. If the target author's profile is **public** → return their moments to any authenticated caller.
2. If the target author's profile is **private** (`RequireApproval`) → check that an `Accepted` follow record exists for
   `(followerUserId: callerId, targetId: authorId)`. If not, return an empty list (do not throw — leaking the existence
   of moments is a privacy concern).

---

## GraphQL API

### New mutations

```graphql
createEventMoment(input: CreateEventMomentInput!): EventMoment
deleteEventMoment(momentId: ID!): Boolean
```

### New queries

```graphql
# Paginated, visibility-filtered list of moments for an event
readEventMoments(eventId: ID!, cursor: String, limit: Int): EventMomentPage

# Lightweight check: does the current user have at least one active moment on this event?
myEventMomentSummary(eventId: ID!): EventMomentSummary
```

### `CreateEventMomentInput`

```typescript
@InputType()
export class CreateEventMomentInput {
  @Field(() => ID)
  eventId: string;

  @Field(() => EventMomentType)
  type: EventMomentType;

  @Field(() => String, { nullable: true })
  caption?: string; // required when type = Text; optional otherwise

  @Field(() => String, { nullable: true })
  mediaKey?: string; // the S3 key returned by getImageUploadUrl (image or video raw upload)
}
```

**Flow for video**:

1. Client calls `getImageUploadUrl(entityType: EventMoment, imageType: PostMedia)` → gets pre-signed PUT URL and S3 key
2. Client uploads raw video file directly to S3
3. Client calls `createEventMoment(input: { type: Video, mediaKey, caption? })` — resolver creates the DB document with
   `state: Processing`
4. S3 ObjectCreated event → Lambda → MediaConvert job starts
5. MediaConvert completion → Lambda updates `state: Ready` and writes `mediaUrl` (HLS .m3u8) + `thumbnailUrl`
6. Client receives WebSocket push (`status_ready` event) or polls `readEventMoments`

---

## S3 Key Structure

Extends the existing convention in `docs/webapp/image-upload-architecture.md`:

| Media type | Raw upload key                                         | Processed output prefix                           |
| ---------- | ------------------------------------------------------ | ------------------------------------------------- |
| Image      | `{stage}/event-moments/{eventId}/{momentId}.{ext}`     | — (served directly from raw key via CF)           |
| Video raw  | `{stage}/event-moments/{eventId}/{momentId}/raw.{ext}` | `{stage}/event-moments/{eventId}/{momentId}/hls/` |
| Video HLS  | _(output by MediaConvert)_                             | `…/hls/index.m3u8`, `…/hls/*.ts`                  |
| Thumbnail  | _(output by MediaConvert)_                             | `…/hls/thumbnail.jpg`                             |

`momentId` is generated server-side before the upload URL is issued, so the key is deterministic and the DB document can
be created atomically with the upload.

---

## Infrastructure Changes

### New CDK resources

1. **MediaConvert queue** — an `aws-mediaconvert.CfnQueue` in `S3BucketStack` (or a new `MediaStack`).
2. **S3 event notification** —
   `imagesBucket.addEventNotification(EventType.OBJECT_CREATED, LambdaDestination(transcodeFunction), { prefix: '{stage}/event-moments/', suffix: '/raw' })`.
3. **Transcode Lambda** — small Node.js Lambda that receives the S3 key, submits a MediaConvert job (HLS 360p + 720p
   renditions + thumbnail), and writes `state: Processing` confirmed.
4. **MediaConvert completion Lambda** — EventBridge rule triggers on `MediaConvert Job State Change (COMPLETE | ERROR)`
   → Lambda updates MongoDB document (`state: Ready/Failed`, writes `mediaUrl`, `thumbnailUrl`, `durationSeconds`).
5. **New env var on GraphQL Lambda** — `MEDIACONVERT_ENDPOINT` (account-specific endpoint URL) and
   `MEDIACONVERT_ROLE_ARN`.

### CloudFront

The existing distribution serves the HLS `.m3u8` and `.ts` segments from the same bucket under the `/processed/` prefix.
No new distribution needed. Cache policy for HLS:

- `.m3u8` playlists: short TTL (30 s) — they're index files and may be updated
- `.ts` segments: long TTL (1 h) — immutable once written by MediaConvert

---

## WebSocket Events

Extends the existing WebSocket channel defined in `docs/api/websocket-adoption-plan.md`.

| Event                  | Payload                                                       | When                                                                      |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `event_status_created` | `{ momentId, eventId, authorId, type, thumbnailUrl?, state }` | Broadcast to followers of author who are currently viewing the event page |
| `event_status_ready`   | `{ momentId, mediaUrl, thumbnailUrl, durationSeconds }`       | Sent to the author when their video finishes transcoding                  |
| `event_status_deleted` | `{ momentId, eventId }`                                       | Broadcast to anyone who received the create event                         |
| `event_status_expired` | `{ momentId, eventId }`                                       | Optional — clients can handle expiry client-side via `expiresAt`          |

---

## Frontend UI

### Stories ring (event detail page)

```
┌───────────────────────────────────────────────────────┐
│  📸 +  ◯ Alice  ◯ Bob  ◯ Org1  ◯ Maya               │
│  Your   (green  (green  (green  (grey                  │
│  story  ring)   ring)   ring)   = no new)              │
└───────────────────────────────────────────────────────┘
```

- Horizontal scroll row of 56 px circular avatar bubbles
- Green ring = unseen status; grey ring = all seen; no ring = no status
- "+ Your story" bubble on the left opens the composer
- Tap any bubble → full-screen story viewer (swipe left/right through stories)

### Composer sheet (bottom sheet / modal)

Three tabs: **Text** | **Photo** | **Video**

- **Text**: `<TextField multiline>` with emoji picker, 280-char limit, background colour picker (a few preset
  event-branded colours)
- **Photo**: two entry points side by side:
  - **Upload** — file input (`accept="image/*"`) picks from the device gallery
  - **Camera** — `getUserMedia({ video: true })` opens a live viewfinder; user taps the shutter button to capture a
    still frame via `<canvas>.toBlob()`
  - Both paths feed into `useImageUpload` → preview → `createEventMoment`
- **Video**: two entry points side by side:
  - **Upload** — file input (`accept="video/*"`) picks from the device. If `file.duration > 15`, the clip is truncated
    to the first 15 s client-side before upload. User sees a preview with a "Trimmed to 15 s" notice.
  - **Record** — `getUserMedia({ video: true, audio: true })` opens a live viewfinder with a record button. Recording
    stops automatically at 15 s (via `MediaRecorder` + a countdown timer); user can also stop early. The recorded `Blob`
    is then uploaded via `useImageUpload`.
  - Both paths feed into `useImageUpload` (same pre-signed URL flow) → `createEventMoment` → shows "Processing…"
    skeleton in the ring while MediaConvert runs

**Browser API notes:**

- `getUserMedia` requires HTTPS (satisfied in all deployed environments; localhost is exempt).
- On iOS Safari, `getUserMedia` is supported from iOS 14.3+. For older iOS versions, fall back gracefully to upload-only
  with a tooltip explaining why capture is unavailable.
- Camera/microphone permission prompts are triggered only when the user taps the Camera or Record button — not on
  composer open.

### Story viewer

Full-screen overlay, progress bar across the top (one segment per status, auto-advances after image/text duration of 5
s; video plays full duration). Swipe or tap left/right to navigate. Bottom-left: author avatar + name + event name.
Bottom-right: delete button (own stories only). Tap-and-hold pauses. Tap left 1/3 = previous; tap right 2/3 = next.

### Feed visibility badge

Small "👁 X viewed" counter visible to the author on their own story. Not visible to other viewers (no read receipts for
others — respects privacy).

---

## Text Status Specifics

- Max 280 characters (Unicode, emojis count as 1)
- `caption` field is the content; `mediaKey` is null
- Background colour stored as a CSS token string (`"bg-purple-600"`, etc.) — add an optional `background?: string` field
  to `EventMoment`
- Rendered server-side as a 1080×1920 OG image for link previews (post-MVP, lower priority)

---

## Compression Summary

| Media      | Raw size (worst case) | After processing | How                                                                                  |
| ---------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| Image      | 10 MB (12 MP phone)   | ~300 KB          | Client resizes to max 1920 px before upload using `canvas.toBlob('image/webp', 0.8)` |
| Video 720p | —                     | ~6 MB / 15 s     | MediaConvert H.264 rendition (single rendition sufficient at this length)            |

Client-side image resize (canvas → WebP) happens inside `useImageUpload` when `entityType === EventMoment` — reduces
upload time and storage cost without a server round trip.

---

## Implementation Phases

### Phase 1 — Text + Image (no video)

| #   | Task                                                                             | Scope        | Backlog ID |
| --- | -------------------------------------------------------------------------------- | ------------ | ---------- |
| 1   | Add `EventMoment` type to `packages/commons/lib/types/`                          | Commons      | API-029    |
| 2   | Add `EventMomentModel` to `apps/api/lib/mongodb/models/`                         | API          | API-029    |
| 3   | Add `EventMomentDAO` (create, readByEvent, readByAuthor, delete)                 | API          | API-029    |
| 4   | Add `createEventMoment` + `deleteEventMoment` mutations (RSVP guard)             | API          | API-029    |
| 5   | Add `readEventMoments` query (follow-filtered, paginated, TTL-aware)             | API          | API-029    |
| 6   | Extend `ImageEntityType` enum with `EventMoment`; `ImageType` with `MomentMedia` | Commons/API  | API-030    |
| 7   | Run codegen                                                                      | Webapp       | —          |
| 8   | Stories ring component on event detail page                                      | Webapp       | WEB-040    |
| 9   | Composer sheet (Text + Photo tabs)                                               | Webapp       | WEB-040    |
| 10  | Story viewer overlay                                                             | Webapp       | WEB-041    |
| 11  | WebSocket push for `event_status_created` / `event_status_deleted`               | API + Webapp | —          |

### Phase 2 — Video

| #   | Task                                                                              | Scope       |
| --- | --------------------------------------------------------------------------------- | ----------- |
| 12  | MediaConvert queue + transcode Lambda + EventBridge completion Lambda             | CDK / Infra |
| 13  | S3 event notification → transcode trigger                                         | CDK         |
| 14  | `state` transitions in `EventMomentDAO` + resolver                                | API         |
| 15  | `event_status_ready` WebSocket push to author                                     | API         |
| 16  | Video tab in composer (client-side duration validation, `<video>` preview)        | Webapp      |
| 17  | HLS playback in story viewer (`hls.js` for Chrome/Firefox; native for Safari/iOS) | Webapp      |
| 18  | "Processing…" skeleton in ring until `state === Ready`                            | Webapp      |

---

## Open Questions

| Question                                                 | Recommended answer                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Can `Interested` RSVPs post?                             | No — restrict to `Going` + `CheckedIn` only                                                                                |
| Can the same user post multiple statuses for one event?  | Yes — 5 per rolling 24-hour window per event (see above)                                                                   |
| When can a user post?                                    | From RSVP confirmation until 48 hours after `event.endDate` (see above)                                                    |
| Reactions on statuses (like / ❤️)?                       | Post-MVP — out of scope for Phase 1                                                                                        |
| Who can see `Failed` statuses?                           | Author only; show "Upload failed, tap to retry"                                                                            |
| Should expired statuses be hard-deleted or soft-deleted? | Hard-deleted via TTL index — simpler, no cleanup job needed                                                                |
| Video size limit (bytes)?                                | 50 MB raw upload limit — generous enough for 15 s 4K; enforced pre-signed URL side via S3 `content-length-range` condition |

---

## New Environment Variables

| Variable                | Where            | Description                                                                                 |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `MEDIACONVERT_ENDPOINT` | API Lambda       | Account-specific MediaConvert endpoint (`https://xxxx.mediaconvert.{region}.amazonaws.com`) |
| `MEDIACONVERT_ROLE_ARN` | API Lambda / CDK | IAM role that MediaConvert assumes to read from and write to S3                             |

Both are injected by CDK and do not need to be set manually for Phase 1 (text + image only).
