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

Posting is allowed from the moment a user's RSVP is confirmed through to **72 hours after the event ends**.

```
 RSVP confirmed ──────────────────────────── event.endDate + 72h
      │                                              │
      ▼                                              ▼
  ┌────────────────────────────────────────────────────┐
  │ Pre-event hype  │  Live moments  │  Post-event recap│
  └────────────────────────────────────────────────────┘
```

**Why no hard start date?** Allowing posts from RSVP time lets attendees build pre-event hype organically — outfit
photos, travel shots, "so excited for this" text statuses. These drive discovery for followers who haven't RSVP'd yet.

**Why 72 hours post-event?** Recap content (highlight photos, group shots) is highest-engagement content for the event
page. 72 hours (three full days) gives attendees time to share memories even after a late-night event — someone who
attended a Saturday midnight show can still post a recap photo on Monday evening. Each status still expires 24 hours
after it is posted regardless.

The posting window is enforced **server-side** in `EventMomentService.create` (reads `event.primarySchedule.endAt`,
rejects requests where `now > endAt + 72h`) and **client-side** in `EventMomentsRing` (the Add button is visually
disabled with a tooltip once the window closes, preventing the user from even opening the composer).

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

### Video clip length: **30 seconds**

| Option      | Notes                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 15 s        | Instagram Stories / TikTok loop cap — very short; limits what users can share at a multi-hour event                                            |
| **30 s** ✅ | WhatsApp Video Status cap — long enough to capture a meaningful moment; raw uploads stay manageable (~75 MB ceiling); transcoding remains fast |
| 60 s        | Significantly more storage and transcoding cost per upload                                                                                     |
| 90 s+       | Storage and transcoding cost jumps significantly; no clear UX benefit                                                                          |

**Decision: 30 seconds max.** The client reads `videoEl.duration` after file selection and rejects files longer than 30
seconds with an immediate error message. The API also verifies video object size from S3 before creating the moment,
`startTranscodeJob` rejects oversized or unverifiable-size raw uploads before MediaConvert, and `onTranscodeEvent`
enforces the 30-second duration limit from MediaConvert output metadata.

**On multiple quality renditions:** For a 30-second clip, adaptive bitrate (ABR) is not necessary. A single 720p H.264
output is simpler, cheaper, and good enough — the whole clip buffers in a couple of seconds on a normal connection
regardless of rendition count. ABR pays off for long-form content where connection quality can fluctuate mid-playback. A
360p fallback rendition can be added later if analytics show buffering complaints.

### Video compression: Yes — server-side transcoding

#### Why we can't just serve raw phone video

When someone records a 15-second clip on their phone and uploads it, the raw file has several problems:

1. **It's huge.** A 30-second clip at 1080p from a modern iPhone or Android phone is typically 60–150 MB. Every viewer
   who opens that moment has to download all of that before the video starts playing.

2. **The codec might not be supported everywhere.** iPhones record in H.265 (HEVC) by default. Many Android phones
   record in H.264. Some use ProRes or VP9. Browsers don't all support the same codecs — a raw `.mov` from an iPhone
   will simply refuse to play in Chrome on Android, for example.

3. **There's no way to adapt to a slow connection.** If a viewer is on a weak 3G signal and we serve a 60 MB file, the
   video will buffer constantly. With a proper transcoded output we can serve lower-quality segments to slow connections
   and higher-quality ones to fast connections automatically — this is called **adaptive bitrate streaming (ABR)**.

#### What we do instead: transcode to HLS

We transcode (convert and compress) the raw video on AWS infrastructure after upload, and produce a format called **HLS
(HTTP Live Streaming)**. HLS breaks the video into small 2-second chunks (`.ts` segment files) and a manifest file
(`.m3u8`) that lists all the chunks. The player reads the manifest and requests the chunks one by one. Because we
produce multiple quality renditions (e.g. 720p and 360p), the player automatically switches between them based on the
viewer's current internet speed — this is the adaptive bitrate magic.

After transcoding, the raw file is no longer what gets served. The browser downloads small compressed chunks instead of
one massive file.

#### The complete pipeline, step by step

**Step 1 — Client-side validation (before anything is uploaded)**

Before the upload even starts, the webapp checks:

- Is the video ≤ 30 seconds? (Read from `videoEl.duration` after the file is selected)
- Is the file ≤ 75 MB? (A reasonable ceiling for a 30-second clip before compression)
- Is the file type one of: `mp4`, `mov`, `webm`? (The three most common phone formats)

If any check fails, the user sees an error message immediately and nothing is uploaded. This is fast, free, and saves
everyone time.

**Step 2 — Getting an upload URL**

The client calls our GraphQL API: `getEventMomentUploadUrl(eventId: "...", extension: "mp4")`.

The API generates a **pre-signed PUT URL** — a temporary URL that allows the client to upload a file directly to our S3
bucket without going through our servers. The URL expires in 15 minutes and is scoped to a specific S3 key path (e.g.
`beta/event-moments/{event-slug}/{username}/{shortId}.mp4`).

The upload key gets a server-generated short ID. The moment document is still created after upload in the current flow.
To handle the small race window where MediaConvert finishes before MongoDB has the moment document, the completion
handler fails the invocation and lets EventBridge retry with a bounded retry policy and DLQ.

**Step 3 — Client uploads the raw file directly to S3**

The client does a `PUT` request directly to S3 using the pre-signed URL. Our API servers are not involved in this
transfer at all — the file goes from the user's device straight to S3. This means:

- Our API Lambda doesn't get charged for the bandwidth
- The upload speed is limited only by the user's connection and S3 (not our server)
- Large files don't time out our Lambda

While the upload is in progress, the client shows an upload progress bar (we can track this via the `XMLHttpRequest`
`progress` event or the fetch API's `ReadableStream`).

**Step 4 — Reserving and publishing the video moment**

When the client asks for a video upload URL, the API first creates an unpublished `EventMoment` reservation with
`state: UploadPending`, stores the expected `rawS3Key`, and returns the reserved `momentId` with the presigned URL.

Once the upload is complete, the client calls `createEventMoment(input: { type: Video, momentId, mediaKey, caption? })`.

The API publishes the reserved document with the user's caption/thumbnail metadata. Pending video states mean:

- `UploadPending`: the raw upload URL was issued, but MediaConvert has not claimed it yet
- `Transcoding`: the S3 event was accepted and a MediaConvert job was submitted
- The moment is not visible to other viewers until it reaches `Ready`

After the user publishes the video moment, the client shows a pending indicator in the stories ring so the author knows
it's working.

**Step 5 — S3 triggers a Lambda automatically**

When a video file is uploaded to S3 under the `event-moments/` path, S3 fires an **event notification** that invokes our
`StartTranscodeJob` Lambda function.

This Lambda is a small Node.js function that does one thing: it reads the S3 key from the event notification, then calls
AWS Elemental MediaConvert to start a transcoding job.

Think of MediaConvert as a very powerful video processing service that AWS runs. You give it an input file and a set of
instructions ("make me a 720p HLS stream and a thumbnail"), and it produces the outputs. You pay per minute of video
processed (about $0.0075 per minute — a 30-second clip costs less than $0.004).

**Step 6 — MediaConvert transcodes the video**

MediaConvert reads the raw file from S3 and produces:

- **720p HLS rendition** — H.264 encoded, segmented into 2-second `.ts` chunks, with an `.m3u8` manifest. Written to:
  `{stage}/event-moments/{event-slug}/{username}/{shortId}/hls/`
- **Thumbnail image** — a JPEG poster frame captured by the client before upload.

The HLS manifest (`{shortId}_720p.m3u8`) is the entry point for the player. A 360p fallback rendition can be added later
if analytics show buffering issues.

This whole step typically takes 15–45 seconds for a 30-second clip.

**Step 7 — A second Lambda fires when transcoding completes**

AWS EventBridge watches for MediaConvert job state changes. When a job transitions to `COMPLETE` (or `ERROR`), it
triggers our `OnTranscodeComplete` (or `OnTranscodeError`) Lambda.

The `OnTranscodeComplete` Lambda:

1. Reads the output paths from the MediaConvert completion event
2. Builds the CloudFront URLs for the HLS manifest and the thumbnail
3. Calls the GraphQL API (or writes directly to MongoDB) to update the moment document:
   - Sets `state: Ready`
   - Sets `mediaUrl` to the CloudFront URL of the HLS manifest (e.g.
     `https://cdn.gatherle.com/event-moments/.../hls/{shortId}_720p.m3u8`)
   - Sets `durationSeconds` from the MediaConvert output metadata
   - `thumbnailUrl` is already set from the client-side thumbnail upload; it is not overwritten

The `OnTranscodeEvent` Lambda also handles ERROR status from MediaConvert: it sets `state: Failed`, which shows the
author a "Upload failed, tap to retry" message.

If the completion Lambda cannot find the matching moment yet, it throws instead of acknowledging the event. EventBridge
then retries the invocation; if the moment is still missing after the configured retry window, the event is retained in
the transcode DLQ for investigation.

**Step 8 — WebSocket push notifies the author**

When the moment transitions to `Ready`, the API pushes a `event_status_ready` WebSocket message to the author's open
connection (if they're still on the page). The client updates the stories ring in real time — the pending indicator is
replaced with the actual bubble.

Other viewers (followers who are on the event page) receive an `event_status_created` push at this point and see the new
bubble appear.

**Step 9 — Playback via CloudFront + hls.js**

When a viewer opens the moment, the player:

1. Fetches the `.m3u8` manifest from CloudFront
2. Starts downloading 2-second `.ts` segment chunks
3. Plays back at 720p H.264

CloudFront caches the `.ts` segments at edge locations worldwide, so even if 1000 people are watching the same moment
simultaneously, the origin S3 bucket is hit very few times.

In the browser, native HLS support varies:

- **Safari / iOS** — supports HLS natively in `<video src="...m3u8">`
- **Chrome / Firefox / Edge** — require `hls.js`, a small JavaScript library (~5 KB gzip) that handles HLS using the
  browser's Media Source Extensions API. We load it only for video moments.

```
┌─────────────┐   PUT shortId.mp4 ┌──────────────────────────────────────┐
│ User device │ ────────────────► │  S3: event-moments/.../shortId.mp4   │
└─────────────┘  (presigned URL)  └───────────────┬──────────────────────┘
                                                   │ S3 ObjectCreated event
                                                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  Lambda: StartTranscodeJob           │
                                  │  - submits MediaConvert job          │
                                  └───────────────┬──────────────────────┘
                                                   │
                                                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  AWS Elemental MediaConvert          │
                                  │  - single 720p HLS rendition         │
                                  └───────────────┬──────────────────────┘
                                                   │ writes output to S3
                                                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  S3: event-moments/.../hls/          │
                                  │  ├── shortId_720p.m3u8               │
                                  │  └── *.ts segments (720p)            │
                                  └───────────────┬──────────────────────┘
                                                   │ EventBridge job COMPLETE/ERROR
                                                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  Lambda: OnTranscodeEvent            │
                                  │  - COMPLETE: state=Ready, mediaUrl   │
                                  │  - ERROR: state=Failed               │
                                  └───────────────┬──────────────────────┘
                                                   │
                                                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  CloudFront CDN                      │
                                  │  serves HLS chunks to viewers        │
                                  └──────────────────────────────────────┘
```

#### What's actually built today vs what's planned

| Component                                                                 | Built? | Notes                                                                                                                           |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| S3 bucket + CloudFront distribution                                       | ✅ Yes | Deployed in `S3BucketStack`                                                                                                     |
| Pre-signed upload URLs                                                    | ✅ Yes | `getEventMomentUploadUrl` mutation works                                                                                        |
| `EventMomentState` model (`UploadPending`/`Transcoding`/`Ready`/`Failed`) | ✅ Yes | In `packages/commons`                                                                                                           |
| `markReady` DAO method                                                    | ✅ Yes | In `EventMomentDAO` — called by `OnTranscodeEvent` Lambda                                                                       |
| `markFailed` DAO method                                                   | ✅ Yes | In `EventMomentDAO` — called by `OnTranscodeEvent` Lambda                                                                       |
| `findByRawS3Key` DAO method + sparse unique index                         | ✅ Yes | Used by transcode start/completion handlers to map S3 key → moment                                                              |
| Client-side duration + size validation (30 s / 75 MB)                     | ✅ Yes | In `EventMomentComposer`                                                                                                        |
| Server-side size check (75 MB) in `createEventMoment`                     | ✅ Yes | Verifies S3 `ContentLength` before creating a video moment                                                                      |
| Server-side size check (75 MB) in `startTranscodeJob`                     | ✅ Yes | Rejects oversized/unverifiable raw uploads before MediaConvert; marks matching reserved moments Failed and deletes the raw file |
| Server-side duration check (30 s) in `onTranscodeEvent`                   | ✅ Yes | Marks moment Failed and deletes raw + per-upload HLS output if duration is missing or exceeds 30 s                              |
| `StartTranscodeJob` Lambda                                                | ✅ Yes | `apps/api/lib/lambdaHandlers/startTranscodeJob.ts`                                                                              |
| `OnTranscodeEvent` Lambda (handles COMPLETE + ERROR)                      | ✅ Yes | `apps/api/lib/lambdaHandlers/onTranscodeEvent.ts`                                                                               |
| S3 → EventBridge notification                                             | ✅ Yes | `eventBridgeEnabled: true` on `S3BucketStack` bucket                                                                            |
| MediaConvert CDK queue + IAM role                                         | ✅ Yes | In `MediaStack`                                                                                                                 |
| EventBridge rule: S3 ObjectCreated → StartTranscodeJob                    | ✅ Yes | In `MediaStack`                                                                                                                 |
| EventBridge rule: MediaConvert COMPLETE/ERROR → OnTranscodeEvent          | ✅ Yes | In `MediaStack`                                                                                                                 |
| Bounded retry + DLQ for transcode completion race                         | ✅ Yes | `OnTranscodeEvent` throws on missing moment; EventBridge retries 3 times within 5 minutes, then sends to SQS DLQ                |
| HLS playback with `hls.js` in viewer                                      | ❌ No  | Viewer still uses raw `<video src>` — Phase 2                                                                                   |
| WebSocket push on `state: Ready`                                          | ❌ No  | Not wired in completion Lambda — Phase 2                                                                                        |

**What this means in practice:** Video moments are uploaded as raw files, then automatically transcoded to 720p HLS by
the MediaConvert pipeline. After transcoding (~15–45 s), `state` transitions from `Transcoding` to `Ready` and the HLS
URL replaces the raw media URL. The upload URL flow creates the DB reservation before S3 accepts the raw video, so
completion can be correlated by `rawS3Key`. Phase 2 work (hls.js viewer, WebSocket push on ready) is still pending.

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
  UploadPending = 'UploadPending', // video upload URL issued, awaiting S3 upload/transcode claim
  Transcoding = 'Transcoding', // MediaConvert job submitted
  Ready = 'Ready', // visible to viewers
  Failed = 'Failed', // transcoding failed
}

@ObjectType('EventMoment')
@modelOptions({ schemaOptions: { timestamps: true } })
@index({ eventId: 1, authorId: 1 })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // MongoDB TTL index
export class EventMoment {
  @Field(() => ID)
  momentId: string; // Mongo _id as string

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

  rawS3Key?: string; // internal S3 key used to correlate upload/transcode events

  isPublished: boolean; // internal visibility flag; false while a reserved video is unpublished

  @Field(() => String, { nullable: true })
  thumbnailUrl?: string; // CF URL for video poster frame (generated by MediaConvert)

  @Field(() => EventMomentState)
  state: EventMomentState; // UploadPending | Transcoding | Ready | Failed

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

| Index                                           | Type          | Purpose                                                |
| ----------------------------------------------- | ------------- | ------------------------------------------------------ |
| `{ eventId: 1, authorId: 1 }`                   | Compound      | Fetch all moments for an event, or all by one author   |
| `{ expiresAt: 1 }` with `expireAfterSeconds: 0` | TTL           | Auto-delete documents 24 h after creation              |
| `{ authorId: 1, createdAt: -1 }`                | Compound      | Reverse-chronological feed for a followed user         |
| `{ rawS3Key: 1 }`                               | Unique sparse | Correlate each raw video upload to one reserved moment |

---

## Authorization Rules

| Operation                                                     | Who can do it                                                                                                                                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEventMoment`                                           | Authenticated user with an active RSVP (`Going` or `CheckedIn`) to the event, within the posting window                                                                                            |
| `readEventMoments(eventId)` — event page                      | Any authenticated user — server returns **all** statuses for that event regardless of follow relationship. Visibility is scoped to the event context only.                                         |
| `readFollowedStatuses` — personal feed                        | Any authenticated user — server returns only statuses from authors the caller follows (across all events), plus the caller's own statuses.                                                         |
| `readUserEventMoments(userId, eventId)` — profile/search mode | Any authenticated user can read statuses from a **public** user (where `followPolicy: Public` or caller is an accepted follower). Private user statuses are restricted to accepted followers only. |
| `deleteEventMoment`                                           | Author of the status, or event organizer (Host / CoHost role)                                                                                                                                      |
| View pending video states (`UploadPending`/`Transcoding`)     | Author only — other viewers see nothing until `Ready`                                                                                                                                              |

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
  @Field(() => ID, { nullable: true })
  momentId?: string; // reserved moment id returned by getEventMomentUploadUrl for video uploads

  @Field(() => ID)
  eventId: string;

  @Field(() => EventMomentType)
  type: EventMomentType;

  @Field(() => String, { nullable: true })
  caption?: string; // required when type = Text; optional otherwise

  @Field(() => String, { nullable: true })
  mediaKey?: string; // the S3 key returned by getEventMomentUploadUrl (image or video raw upload)
}
```

**Flow for video**:

1. Client calls `getEventMomentUploadUrl(eventId, extension)` → API reserves an unpublished `UploadPending` moment and
   returns pre-signed PUT URL, S3 key, and `momentId`
2. Client uploads raw video file directly to S3
3. Client calls `createEventMoment(input: { type: Video, momentId, mediaKey, caption? })` — resolver publishes the
   reserved row with user metadata
4. S3 ObjectCreated event → Lambda atomically claims `UploadPending -> Transcoding` by `rawS3Key` → MediaConvert job
   starts
5. MediaConvert completion → Lambda updates `state: Ready` and writes `mediaUrl` (HLS .m3u8) + `thumbnailUrl`
6. Client receives WebSocket push (`status_ready` event) or polls `readEventMoments`

---

## S3 Key Structure

Extends the existing convention in `docs/webapp/media-upload-architecture.md`:

| Media type | Raw upload key                                                | Processed output prefix                   |
| ---------- | ------------------------------------------------------------- | ----------------------------------------- |
| Image      | `{stage}/event-moments/{event-slug}/{username}/{shortId}.ext` | — (served directly from raw key via CF)   |
| Video raw  | `{stage}/event-moments/{event-slug}/{username}/{shortId}.ext` | `{raw-upload-key-without-ext}/hls/`       |
| Video HLS  | _(output by MediaConvert)_                                    | `…/hls/{shortId}_720p.m3u8`, `…/hls/*.ts` |
| Thumbnail  | `{stage}/event-moments/{event-slug}/{username}/{shortId}.jpg` | — (client-generated poster served via CF) |

A server-generated short ID makes each upload key unique. Video uploads now create the DB reservation before issuing the
URL so the key and DB state are atomic.

---

## Infrastructure Changes

### New CDK resources

1. **MediaConvert queue** — an `aws-mediaconvert.CfnQueue` in `S3BucketStack` (or a new `MediaStack`).
2. **S3 event notification** —
   `mediaBucket.addEventNotification(EventType.OBJECT_CREATED, LambdaDestination(transcodeFunction), { prefix: '{stage}/event-moments/', suffix: '/raw' })`.
3. **Transcode Lambda** — small Node.js Lambda that receives the S3 key, atomically claims the reserved moment as
   `Transcoding`, and submits a MediaConvert job (HLS 360p + 720p renditions + thumbnail).
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
  - Both paths use the event moment upload URL flow → preview → `createEventMoment`
- **Video**: two entry points side by side:
  - **Upload** — file input (`accept="video/*"`) picks from the device. If `file.duration > 15`, the clip is truncated
    to the first 15 s client-side before upload. User sees a preview with a "Trimmed to 15 s" notice.
  - **Record** — `getUserMedia({ video: true, audio: true })` opens a live viewfinder with a record button. Recording
    stops automatically at 15 s (via `MediaRecorder` + a countdown timer); user can also stop early. The recorded `Blob`
    is then uploaded via the event moment upload URL flow.
  - Both paths use the same pre-signed URL flow → `createEventMoment` → shows a pending indicator in the ring while
    MediaConvert runs

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

Client-side image resize (canvas → WebP) happens before the event moment upload URL flow — reduces upload time and
storage cost without a server round trip.

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
| 6   | Extend `MediaEntityType` enum with `EventMoment`; `MediaType` with `MomentMedia` | Commons/API  | API-030    |
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
| 18  | Pending indicator in ring until `state === Ready`                                 | Webapp      |

---

## Open Questions

| Question                                                 | Recommended answer                                                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can `Interested` RSVPs post?                             | No — restrict to `Going` + `CheckedIn` only                                                                                                                                      |
| Can the same user post multiple statuses for one event?  | Yes — 5 per rolling 24-hour window per event (see above)                                                                                                                         |
| When can a user post?                                    | From RSVP confirmation until 72 hours after `event.endDate` (see above)                                                                                                          |
| Reactions on statuses (like / ❤️)?                       | Post-MVP — out of scope for Phase 1                                                                                                                                              |
| Who can see `Failed` statuses?                           | Author only; show "Upload failed, tap to retry"                                                                                                                                  |
| Should expired statuses be hard-deleted or soft-deleted? | Hard-deleted via TTL index — simpler, no cleanup job needed                                                                                                                      |
| Video size limit (bytes)?                                | 75 MB raw upload limit — generous enough for 30 s at high quality; enforced client-side pre-upload and server-side via S3 `content-length-range` condition on the pre-signed URL |

---

## New Environment Variables

| Variable                | Where            | Description                                                                                 |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `MEDIACONVERT_ENDPOINT` | API Lambda       | Account-specific MediaConvert endpoint (`https://xxxx.mediaconvert.{region}.amazonaws.com`) |
| `MEDIACONVERT_ROLE_ARN` | API Lambda / CDK | IAM role that MediaConvert assumes to read from and write to S3                             |

Both are injected by CDK and do not need to be set manually for Phase 1 (text + image only).
