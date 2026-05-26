# Moments Platform

**Last consolidated:** 26 May 2026  
**Scope:** event-linked moments foundation + dedicated moments feed expansion

This document consolidates Gatherle's moments work into one product and engineering reference.

It covers two related surfaces:

1. **Event Moments**: the event-bound stories surface that lets attendees post text, images, and short videos.
2. **Moments Feed**: the dedicated mobile discovery surface that turns those moments into a ranked, swipeable feed.

The intention is simple: moments should feel like one platform capability with multiple surfaces, not two unrelated
features documented separately.

---

## Platform Overview

Moments gives Gatherle a lightweight, high-frequency content loop around real-world events.

### Why moments matter

- before an event, they build anticipation
- during an event, they prove presence and create momentum
- after an event, they create memory and social proof
- across the product, they make Gatherle feel live instead of transactional

### The two product surfaces

| Surface       | Primary job                                           | Current state              |
| ------------- | ----------------------------------------------------- | -------------------------- |
| Event Moments | Let attendees post and watch event-specific moments   | Foundation largely built   |
| Moments Feed  | Turn moments into a first-class mobile discovery loop | Product and ranking design |

### Shared product principle

Gatherle moments should stay grounded in real life:

- tied to real users
- tied to real events
- tied to real attendance or organizer context
- useful for discovery, not random entertainment

---

## Shared Rules

These rules apply across all moments surfaces unless noted otherwise.

### Supported content types

- text moment
- image moment
- short video moment

### TTL

All moments expire **24 hours after creation**.

Implementation rule:

- `expiresAt = createdAt + 24h`
- MongoDB TTL index deletes expired rows automatically

### Posting window

Posting is allowed from RSVP confirmation until **72 hours after the event ends**.

This supports:

- pre-event hype
- in-event live posting
- short post-event recap sharing

### Author posting limit

Limit: **5 moments per rolling 24-hour window per event, per author**

This is the best balance between:

- allowing real activity during a live event
- avoiding spam in follower-facing surfaces

### Video limits

- max duration: **30 seconds**
- raw upload ceiling: **75 MB**
- supported formats: `mp4`, `mov`, `webm`

### Safety and visibility baseline

Moments must always respect:

- blocked users
- muted users
- muted organizations
- moderation state
- profile privacy rules where relevant
- author and organizer delete/moderation permissions

---

## Surface 1: Event Moments

Event Moments is the foundation. It is the event-scoped stories surface shown on the event detail page.

### Core experience

- attendees see a ring of story bubbles at the top of the event page
- eligible attendees can add their own text, image, or video moment
- viewers open a full-screen story viewer
- organizers can see all event moments for moderation

### Visibility model

| Surface                      | Visibility rule                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Event page ring              | all moments for that event are visible to authenticated viewers on the event |
| Personal/followed moments    | only followed authors plus the viewer's own moments                          |
| Public profile / search view | public users are visible directly; private users require an accepted follow  |
| Author view                  | authors always see their own moments, including pending/failed video states  |
| Organizer moderation view    | event organizers can view all moments on their event                         |

### Who can post

Only users with an active RSVP to the event.

Accepted statuses:

- `Going`
- `CheckedIn`

Excluded:

- `Interested`
- `Waitlisted`
- `Cancelled`

### What happens if the user later cancels their RSVP

The existing moment stays visible until it expires naturally.

Rationale:

- the user was eligible at creation time
- removing already-published content would be surprising
- the RSVP gate is a **creation-time** rule, not a retroactive visibility rule

### Event Moments UX

#### Ring

- horizontal avatar bubble row
- green ring for unseen
- grey ring for seen
- "your moment" entry point on the left

#### Composer

Tabs:

- `Text`
- `Photo`
- `Video`

Expected behavior:

- text composer with short caption/status UX
- photo upload/capture
- video upload/record
- progress and pending states during upload/transcode

#### Viewer

- full-screen story viewer
- tap left/right to move between segments
- hold to pause
- author and organizer delete controls where allowed

---

## Event Moments Video Architecture

Video moments need a distinct upload and processing pipeline so playback is fast, consistent, and cost-bounded.

### Why raw phone video is not enough

- raw files are too large
- codecs vary by device
- direct playback support is inconsistent
- slow connections perform badly without processing

### Processing approach

Use server-side transcoding to HLS after direct-to-S3 upload.

### Upload and transcode flow

1. The client validates duration, size, and file type before upload.
2. The client calls `getEventMomentUploadUrl(eventId, extension)`.
3. The API reserves an unpublished `EventMoment` in `UploadPending` state and returns:
   - presigned PUT URL
   - raw S3 key
   - reserved `momentId`
4. The client uploads the raw video directly to S3.
5. The client calls `createEventMoment(input)` to publish the reserved row with caption/metadata.
6. S3 object creation triggers the transcode-start Lambda.
7. The Lambda atomically claims `UploadPending -> Transcoding` by `rawS3Key` and submits a MediaConvert job.
8. MediaConvert writes HLS output to S3.
9. The completion Lambda marks the moment `Ready` or `Failed` and stores the final playback URL.

### Resulting states

- `UploadPending`
- `Transcoding`
- `Ready`
- `Failed`

### Playback

- HLS is the canonical playback format for processed video
- CloudFront serves manifests and segments
- native HLS is used where available
- `hls.js` can support browsers without native HLS

### Implementation status snapshot

Already in place:

- direct upload URL issuance
- reserved video moment flow
- transcode start/completion Lambdas
- `UploadPending` / `Transcoding` / `Ready` / `Failed` states
- size and duration enforcement in the upload/transcode path

Still follow-up work or implementation-dependent:

- final viewer behavior for HLS on every browser path
- realtime "ready" refresh behavior where not already wired through UI state

---

## Event Moments Data Model

Primary entity: `EventMoment`

Core fields:

- `momentId`
- `eventId`
- `authorId`
- `type`
- `caption?`
- `mediaUrl?`
- `thumbnailUrl?`
- `rawS3Key?`
- `state`
- `durationSeconds?`
- `isPublished`
- `expiresAt`
- `createdAt`

Key indexes:

- `{ eventId: 1, authorId: 1 }`
- `{ expiresAt: 1 }` TTL
- `{ authorId: 1, createdAt: -1 }`
- `{ rawS3Key: 1 }` unique sparse

### GraphQL surface

Key queries and mutations:

- `getEventMomentUploadUrl`
- `createEventMoment`
- `deleteEventMoment`
- `readEventMoments`
- `myEventMomentSummary`
- followed-user moments feed queries

### Authorization summary

| Operation                  | Rule                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Create moment              | authenticated user with eligible RSVP, within posting window |
| Read event moments         | authenticated viewer on the event surface                    |
| Read followed moments      | authenticated viewer; follows and privacy rules apply        |
| Delete moment              | author or event organizer                                    |
| View pending/failed states | author only                                                  |

### Storage layout

This extends the shared media upload conventions in
[../frontend/media-upload-architecture.md](../frontend/media-upload-architecture.md).

| Media type | Key pattern                                                   |
| ---------- | ------------------------------------------------------------- |
| Image      | `{stage}/event-moments/{event-slug}/{username}/{shortId}.ext` |
| Video raw  | `{stage}/event-moments/{event-slug}/{username}/{shortId}.ext` |
| Video HLS  | `{raw-upload-key-without-ext}/hls/...`                        |
| Thumbnail  | `{stage}/event-moments/{event-slug}/{username}/{shortId}.jpg` |

---

## Surface 2: Moments Feed

The dedicated Moments Feed is the expansion layer. It turns event moments into a first-class mobile discovery surface.

### Product goal

Turn moments from a supporting feature into a primary mobile engagement loop that also drives:

- profile discovery
- organization discovery
- event opens
- saves
- RSVPs

### Navigation decision

The consolidated recommendation is to **add `Moments` to the mobile bottom nav without removing `Notifications`** for
the first release of this surface.

Proposed nav:

1. `Home`
2. `Events`
3. `Moments`
4. `Messages`
5. `Notifications`
6. `Profile`

Reasoning:

- `Moments` deserves first-class placement
- `Notifications` still has daily utility
- if the six-item layout feels crowded, revisit visual density first before cutting the feature

### Feed experience

The feed is:

- full-screen
- vertical
- swipeable
- paginated
- immersive

Each item should preserve context:

- author
- event
- organization when relevant
- relative time

Primary actions:

- `View event`
- `View profile`
- `Follow`
- `Save event`
- `RSVP`
- `Share`
- `Hide`
- `Report`

Primary CTA:

- `View event`

### Content sources

The feed should blend content from:

1. followed users and followed organizations
2. category or interest matches
3. nearby or local activity
4. network momentum and trending activity

This should never become a random entertainment feed detached from Gatherle's real-life graph.

---

## Moments Feed Ranking

### Ranking philosophy

The feed should feel:

- relevant
- fresh
- local
- socially alive
- varied

It should **not** feel:

- repetitive
- dominated by one author
- dominated by one event
- random and contextless

### First-pass scoring signals

| Signal                     | Max pts | Notes                                      |
| -------------------------- | ------: | ------------------------------------------ |
| Followed author            |      40 | strongest relationship signal              |
| Followed organization      |      28 | strong organizer/host discovery signal     |
| Event interest match       |      24 | category overlap with the viewer           |
| Nearby location            |      20 | city or region match                       |
| Social proof               |      18 | friends or network attending the event     |
| Event momentum             |      18 | save/RSVP/moment activity around the event |
| Moment engagement velocity |      15 | recent interaction rate                    |
| Freshness                  |      18 | strongest in the first hour                |
| Author novelty             |      10 | avoid repeating the same creator           |
| Venue / org novelty        |       8 | avoid repetitive same-source feed          |

### Freshness model

| Age    | Boost |
| ------ | ----: |
| 0-1h   |   +18 |
| 1-3h   |   +15 |
| 3-6h   |   +12 |
| 6-12h  |    +8 |
| 12-18h |    +4 |
| 18-24h |    +1 |

### Diversity rules

Hard constraints:

- max 2 sequential moments from the same author
- max 2 sequential moments from the same event
- never show blocked, muted, or hidden content

Soft constraints:

- interleave followed and discovery content
- avoid heavy repetition from the same organization
- make sure discovery still appears if quality is high enough

### Feed mix

First-pass blend:

- 45% followed-user / followed-org content
- 25% interest-matched public content
- 20% nearby / local content
- 10% trending wildcard content

Cold-start blend:

- 10% followed content
- 40% interest-matched content
- 35% local content
- 15% trending content

---

## Moments Feed Product Flow

### Discovery flow

1. User opens `Moments`
2. Sees a public moment from someone they do not follow
3. Taps `View event`
4. Saves or RSVPs

### Social expansion flow

1. User opens `Moments`
2. Sees a compelling moment from a public user
3. Opens the profile
4. Follows or messages them

### Local discovery flow

1. User opens `Moments`
2. Sees a nearby event or venue
3. Opens the event detail
4. Shares, saves, or RSVPs

### Information architecture

Likely mobile building blocks:

- `MomentsScreen`
- `MomentsFeedPager`
- `MomentFeedCard`
- `MomentFeedOverlay`
- `MomentFeedActions`
- `MomentFeedRankingReason`

The feed should reuse the existing viewer and moment query types where possible, but it should remain a distinct surface
from the event-page ring.

---

## Analytics

### Event Moments foundation

Track:

- create attempts
- create success/failure
- upload failures
- video transcode failures
- viewer opens
- completion rate

### Dedicated Moments Feed

Track from day one:

- feed opens
- average session depth
- average moments viewed per session
- event detail opens from moments
- follows from moments
- saves from moments
- RSVPs from moments
- author profile opens
- skip-in-first-second rate
- hide / mute / report rate

---

## Rollout Sequence

### Phase 1: Event Moments foundation

- event page ring
- text and image moments
- create/read/delete flows
- upload states and moderation basics

### Phase 2: Event Moments video maturity

- reserved upload flow
- transcode pipeline
- ready/failed state handling
- viewer support for processed video

### Phase 3: Dedicated Moments Feed

- bottom-nav Moments destination
- ranked feed query
- followed + discovery mix
- event/profile/follow actions

### Phase 4: Personalization and moderation depth

- stronger ranking signals
- "why you're seeing this" explanations
- more explicit hide / mute / not-interested feedback loops
- experimentation on feed mix and ranking weights

---

## Final Recommendation

Build moments as one platform capability in this order:

1. keep strengthening the event-scoped foundation
2. reuse that foundation to power a dedicated mobile feed
3. optimize the feed for event discovery and RSVP conversion, not just watch time

If done well, moments becomes the surface that makes Gatherle feel active, local, and socially alive.
