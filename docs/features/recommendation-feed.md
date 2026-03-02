# Recommendation & Feed System

## Overview

The recommendation system generates a personalised event feed for each user using a **rule-based scoring engine**.
Scores are pre-computed and stored in a dedicated MongoDB collection so the `readRecommendedFeed` GraphQL query is
always a cheap indexed read.

The engine lives entirely inside the API codebase (`apps/api/lib/services/recommendation.ts`) with no external service
dependencies. The architecture is deliberately shaped so the scorer can be extracted into a standalone microservice
later with minimal refactoring — the `UserFeed` collection becomes the contract boundary.

---

## Files

| File                                      | Role                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `packages/commons/lib/types/userFeed.ts`  | `UserFeedItem` TypeGraphQL/Typegoose type + `FeedReason` enum |
| `apps/api/lib/mongodb/models/userFeed.ts` | Mongoose model (`UserFeed` collection)                        |
| `apps/api/lib/mongodb/dao/userFeed.ts`    | Data-access layer for the `user_feed` collection              |
| `apps/api/lib/services/recommendation.ts` | Scoring engine + event-driven trigger methods                 |
| `apps/api/lib/graphql/resolvers/feed.ts`  | `readRecommendedFeed` query + `refreshFeed` mutation          |

---

## Data Model

```
UserFeedItem {
  feedItemId  string       (PK, same as _id)
  userId      string       (partition key — indexed, not in GraphQL)
  eventId     string
  score       number       (float — higher is more relevant)
  reasons     FeedReason[] (which signals fired)
  computedAt  Date
  expiresAt   Date         (MongoDB TTL — document auto-deleted after 7 days)
}
```

### MongoDB indexes

```
{ userId, score: -1 }            — primary read index (sorted feed per user)
{ userId, eventId }, unique      — prevents duplicates
{ expiresAt }, expireAfterSeconds: 0   — TTL auto-cleanup
```

### `FeedReason` enum

Exposed in GraphQL so the client can show "your friends are going" / "matches your interests" labels without additional
queries.

```
CategoryMatch        user.interests ∩ event.eventCategories
FriendAttending      followed user has an active RSVP (EventParticipant)
FollowedOrgHosting   event.orgId is in user's followed organisations
NetworkSaved         followed user saved the event
TimeUrgency          event starts within 30 days
Popularity           combined rsvpCount + savedByCount is high
Freshness            event created within the last 7 days
```

---

## Scoring

All weights live in the `SCORE_WEIGHTS` constant in `recommendation.ts`. When these become ML-learned parameters they
can be replaced in one place.

| Signal                   | Max pts | Notes                                    |
| ------------------------ | ------- | ---------------------------------------- |
| Category match           | 30      | Binary — matches at least one category   |
| Friends attending        | 50      | 25 pts × friend count, capped at 50      |
| Followed org hosting     | 20      | Binary                                   |
| Network saved            | 20      | 10 pts × friend-save count, capped at 20 |
| Time urgency ≤ 7 days    | 15      |                                          |
| Time urgency ≤ 14 days   | 10      |                                          |
| Time urgency ≤ 30 days   | 5       |                                          |
| Popularity (≥ 20 total)  | 10      | rsvpCount + savedByCount                 |
| Popularity (≥ 5 total)   | 5       |                                          |
| Freshness (≤ 7 days old) | 5       |                                          |
| **Max possible**         | **120** |                                          |

Events with a score of 0 (no signal fired) are not stored in the feed.

### Exclusion rules

Events are never surfaced if:

- The user has already RSVPd for the event (`EventParticipant` record exists)
- The user has saved the event (Follow → Event)
- The `orgId` is in `user.mutedOrgIds`
- `lifecycleStatus !== Published`
- `status` is not `Upcoming` or `Ongoing`
- `visibility` is `Private` or `Invitation`

---

## Feed Lifecycle

```
                 ┌─────────────────────────────────────┐
                 │           Trigger fires              │
                 │  RSVP'd / User followed /            │
                 │  Event published                     │
                 └──────────────┬──────────────────────┘
                                │ fire-and-forget
                                ▼
                 ┌─────────────────────────────────────┐
                 │   RecommendationService              │
                 │   .computeFeedForUser(userId)        │
                 │                                      │
                 │  1. Load user profile + social graph │
                 │  2. Load candidate events            │
                 │  3. Apply exclusions                 │
                 │  4. Score each event                 │
                 │  5. Clear + bulk-upsert to user_feed │
                 └──────────────┬──────────────────────┘
                                │
                                ▼
                 ┌─────────────────────────────────────┐
                 │   user_feed collection               │
                 │   (TTL: 7 days)                      │
                 └──────────────┬──────────────────────┘
                                │
                                ▼
                 ┌─────────────────────────────────────┐
                 │   readRecommendedFeed GQL query                 │
                 │                                      │
                 │   empty  → compute sync, return      │
                 │   stale  → return cache, refresh bg  │
                 │   fresh  → return cache              │
                 └─────────────────────────────────────┘
```

**Staleness threshold:** 24 hours (`FEED_STALE_AFTER_HOURS`). Determined by the oldest `computedAt` across the returned
items.

---

## Event-Driven Triggers

Three write paths each fire a feed trigger after their primary operation:

| Trigger call                     | Where                       | What it does                                       |
| -------------------------------- | --------------------------- | -------------------------------------------------- |
| `onRsvpUpdated(userId)`          | `EventParticipantResolver`  | Removes event from feed (sync) + recomputes feed   |
| `onUserFollowed(followerUserId)` | `FollowService.follow`      | Recomputes the new follower's feed                 |
| `onEventPublished(eventId)`      | `EventResolver.updateEvent` | Logs; lazy recompute on next `readRecommendedFeed` |

All triggers are **fire-and-forget** — they cannot block the primary mutation response. Errors are logged at `warn`
level.

---

## GraphQL API

```graphql
# Returns the personalised feed for the authenticated user, sorted by score desc.
# Lazily recomputes if the cache is empty or stale (>24h).
query ReadFeed($limit: Int, $skip: Int) {
  readRecommendedFeed(limit: $limit, skip: $skip) {
    feedItemId
    eventId
    score
    reasons # FeedReason[] — use for "why you're seeing this" labels
    computedAt
    event {
      eventId
      title
      primarySchedule {
        startAt
      }
      # ... any other Event fields
    }
  }
}

# Force a full synchronous recomputation of the user's feed.
# Returns true when complete. Use sparingly — prefer the automatic triggers.
mutation RefreshFeed {
  refreshFeed
}
```

The `event` field is resolved via the existing `DataLoader` so fetching 50 feed items issues a single batched DB query.

---

## Configuration Constants

All tunable knobs are in `recommendation.ts`:

| Constant                 | Default         | Effect                                                                      |
| ------------------------ | --------------- | --------------------------------------------------------------------------- |
| `SCORE_WEIGHTS.*`        | see table above | Relative weight of each signal                                              |
| `FEED_TTL_DAYS`          | 7               | MongoDB TTL — how long a feed document lives                                |
| `FEED_STALE_AFTER_HOURS` | 24              | When a cached feed triggers a background refresh                            |
| `MAX_CANDIDATE_EVENTS`   | 500             | Max events evaluated per computation — guards against full-collection scans |

---

## Scale Roadmap

### Beta (current)

- Feed computed synchronously on demand or fire-and-forget on triggers
- All events scanned serially (capped at 500)
- No fan-out to follower feeds

### National scale (100K+ users)

- Replace fire-and-forget triggers with **SQS messages** to a background worker
- `onEventPublished` fans out to followers + interest-matched users
- Candidate pre-filter: only score events whose categories intersect `user.interests`, reducing scan size from N events
  to a fraction
- Redis cache in front of `readRecommendedFeed` for sub-10ms reads

### Microservice extraction

The `user_feed` collection is the natural boundary. Extract `recommendation.ts` into `apps/recommendation-service/` with
its own Lambda/ECS deployment. The GraphQL API becomes a thin reader of `user_feed` — no scoring logic lives in the API.
