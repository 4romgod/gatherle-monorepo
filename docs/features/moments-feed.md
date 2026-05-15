# Mobile Moments Feed

**Date:** 15 May 2026  
**Status:** 📋 Product + UX + ranking design  
**Feature:** Full-screen vertical `Moments` feed for mobile discovery and retention

---

## Overview

Gatherle already has event-linked moments. The next step is to turn moments into a dedicated, high-retention mobile
surface:

- full-screen
- vertically swipeable
- endless / paginated
- optimized for discovery
- tied back to real users, organizations, venues, and events

This is the closest thing Gatherle should have to an Instagram Reels / TikTok-style destination. The difference is that
Gatherle moments should not become random entertainment content. They should remain grounded in the real-life social
graph:

- who is active
- which events are alive right now
- which organizations are interesting
- what is happening nearby

The feed should help users:

1. discover people and organizations they do not yet follow
2. discover events they may want to RSVP to
3. spend more time in-app
4. return more frequently because the content feels live and local

---

## Product Goal

Turn moments from a supporting feature into a primary mobile engagement loop.

Today:

- moments exist on event pages and profile-like surfaces
- they are useful, but mostly secondary

Target state:

- moments become a primary destination in the bottom navigation
- users can open one feed and continuously swipe through live community content
- each moment becomes a discovery point for:
  - a user
  - an organization
  - an event
  - a venue / place

---

## Navigation Decision

### Bottom nav change

We should **add `Moments` to the bottom nav without removing `Notifications`**.

### Why

`Moments` is a primary engagement destination, but `Notifications` still serves an important real-time utility role.

In Gatherle's case, it is acceptable to carry **six** primary mobile destinations because:

- the app already spans discovery, messaging, notifications, and profile
- `Moments` deserves first-class entry instead of being buried in `Home`
- `Notifications` still has meaningful daily utility and should remain one tap away

### New bottom nav

1. `Home`
2. `Events`
3. `Moments`
4. `Messages`
5. `Notifications`
6. `Profile`

### UX implications

Because six items is denser than a more traditional five-item bottom nav, the design should compensate by:

- using compact icon-first items
- minimizing visible labels or reducing label emphasis
- keeping the selected state very clean
- making sure the center `Moments` item reads like a high-value destination

If this ever feels crowded in practice, the first thing to revisit is **visual density**, not the feature's place in
navigation.

---

## Feed Experience

### Core interaction model

The feed is a full-screen vertical pager.

Users:

- swipe up for next moment
- swipe down for previous moment
- tap through story segments within a moment group
- tap the author to open the profile
- tap the event CTA to open the related event
- act directly from the feed

### Content format

Each feed item can be:

- text moment
- image moment
- short video moment

Each item should always preserve context:

- author
- event
- organization when relevant
- relative time

### Primary actions on an open moment

At minimum, the viewer should support:

- `View event`
- `View profile`
- `Follow`
- `Save event`
- `RSVP`
- `Share`
- `Hide`
- `Report`

Not every action needs to be visually equal. The primary CTA is:

- `View event`

That is the bridge from engagement to conversion.

---

## Why This Feature Matters

This feature gives Gatherle a surface that is:

- habit-forming
- highly mobile-native
- content-rich
- socially discoverable
- event-conversion-friendly

Unlike traditional feeds, moments are:

- ephemeral
- lightweight
- visually digestible
- easier to create than polished posts

That makes them perfect for mobile engagement.

---

## Content Sources

The feed should not be limited to only followed users.

It should blend content from four main source types:

1. **Follow graph**
   - users you follow
   - organizations you follow

2. **Interest graph**
   - events matching your event-category interests
   - people who are active in categories you care about

3. **Local / geographic graph**
   - nearby venues
   - nearby events
   - activity in your city / region

4. **Network / momentum graph**
   - trending event moments
   - highly engaged moments
   - moments from events that many users are saving / RSVPing to

---

## Ranking Philosophy

The feed should feel:

- relevant
- fresh
- local
- socially alive
- varied

It should **not** feel:

- repetitive
- dominated by a single user
- dominated by old content
- random and contextless

### Guiding principle

Rank moments by a combination of:

- relationship
- event relevance
- freshness
- momentum
- locality
- diversity constraints

---

## Ranking Model

The first version should be rule-based, similar to the recommendation-feed architecture.

Each candidate moment gets a score.

### Candidate pool

Candidates should come from:

- followed users' moments
- followed organizations' event moments
- public moments from events matching the viewer's interests
- public moments from nearby events
- trending public moments from the recent window

Time window:

- active moments only
- newest first in the candidate pool
- ranking window can consider the last 24 hours only, since moments expire

---

## Scoring Signals

Suggested first-pass signals:

| Signal                            | Max pts | Notes                                          |
| --------------------------------- | ------: | ---------------------------------------------- |
| Followed author                   |      40 | Strongest relationship signal                  |
| Followed organization             |      28 | Important for organizer-driven discovery       |
| Event interest match              |      24 | Category overlap with the user                 |
| Nearby location                   |      20 | City/region match                              |
| Friend or network attending event |      18 | Social proof                                   |
| Event momentum                    |      18 | Event has strong save / RSVP / moment activity |
| Moment engagement velocity        |      15 | High interaction in recent period              |
| Freshness ≤ 1h                    |      18 | Strong freshness boost                         |
| Freshness ≤ 6h                    |      12 | Medium freshness boost                         |
| Freshness ≤ 12h                   |       8 | Small freshness boost                          |
| Author novelty                    |      10 | Not seen recently in feed                      |
| Venue / org novelty               |       8 | Avoid repetitive same-source feed              |

The numbers above are directional, not final. The important part is the weighting pattern:

- social graph first
- freshness second
- discoverability third

### Example weighted formula

```text
score =
  followed_author
  + followed_org
  + interest_match
  + local_match
  + social_proof
  + event_momentum
  + moment_velocity
  + freshness
  + novelty
  - repetition_penalty
  - hidden_or_muted_penalty
```

---

## Freshness Model

Moments are ephemeral, so freshness matters more here than in the event feed.

Suggested freshness buckets:

| Age    | Boost |
| ------ | ----: |
| 0-1h   |   +18 |
| 1-3h   |   +15 |
| 3-6h   |   +12 |
| 6-12h  |    +8 |
| 12-18h |    +4 |
| 18-24h |    +1 |

This keeps the feed alive without making it pure reverse-chronological ordering.

---

## Event Momentum Signal

Moments tied to "alive" events should rank higher.

Possible event-momentum inputs:

- RSVP count
- save count
- number of unique moment authors on the event
- recent moment count on the event
- event starts soon

This lets the feed surface not only people, but **energy around events**.

### Example

An event with:

- 40 RSVPs
- 8 moment authors
- 15 recent moments
- starts tonight

should rank above a random low-activity event moment, even if both are equally fresh.

---

## Diversity Rules

Raw scoring is not enough. The feed also needs guardrails.

### Hard constraints

- do not show more than `N` consecutive moments from the same author
- do not show more than `N` consecutive moments from the same event
- do not show hidden / muted users or organizations
- do not show blocked users

### Soft constraints

- interleave followed and discovery content
- avoid showing three moments in a row from the same organization
- avoid repeating the same event too heavily

### First-pass recommended constraints

- max 2 sequential moments from the same author
- max 2 sequential moments from the same event
- at least every 4th item should be a discovery candidate if quality is good enough

These constraints matter a lot. Without them, the feed will feel narrow even if the ranking is technically correct.

---

## Feed Mix

The feed should not be 100% "people you follow" and not 100% discovery.

Suggested blend for the first version:

- 45% followed-user / followed-org content
- 25% interest-matched public content
- 20% nearby / local content
- 10% trending wildcard content

This creates a feed that feels familiar, but still expands the user's graph.

### Cold-start mix

For new users with weak follow graph:

- 10% followed content
- 40% interest-matched content
- 35% local content
- 15% trending content

This is important so the feed works well even before a user has built a network.

---

## Conversion Goals

This feature should not optimize only for watch time.

It should also drive:

- profile opens
- follows
- event detail opens
- saves
- RSVPs
- organization discovery

### Primary downstream conversion

`Moment view -> Event detail open -> Save / RSVP`

That should be considered the most important product funnel created by this feature.

---

## User Flows

### Flow 1: discovery

1. User opens `Moments`
2. Sees a public moment from someone they do not follow
3. Swipes through
4. Taps `View event`
5. Saves or RSVPs

### Flow 2: social expansion

1. User opens `Moments`
2. Sees moments from a public user with strong event taste
3. Taps the avatar / profile
4. Follows or messages them

### Flow 3: local event discovery

1. User opens `Moments`
2. Sees a venue/event in their city
3. Opens event details
4. Shares or RSVPs

---

## Information Architecture

### New route

Add a dedicated bottom-nav screen:

- `MomentsScreen`

### Main components

- `MomentsFeedPager`
- `MomentFeedCard`
- `MomentFeedOverlay`
- `MomentFeedActions`
- `MomentFeedRankingReason`

### Existing components to reuse

- `MomentViewer`
- moment query types
- profile routing
- event detail routing

The dedicated feed should reuse as much of the existing moment-viewing logic as possible, but the feed itself should be
treated as a separate surface from story rings.

---

## UX Notes

### Visual direction

This feature should still follow the **Elevation Zero** design system:

- flat surfaces
- border-led UI
- clean typography
- minimal clutter

But the full-screen moment surface can bend that slightly because it is immersive by nature.

Recommended:

- clean overlays
- no heavy card chrome
- minimal but legible controls
- event CTA as a pill
- subtle progress indicators

### Interaction notes

- vertical swipe = next / previous feed item
- tap left / right = previous / next segment
- long press = pause
- swipe down = dismiss to previous screen if opened modally

---

## Safety / Quality Rules

The feed should respect:

- blocked users
- muted users
- muted organizations
- hidden events
- private profile rules where applicable
- moderation state on moments

We should also add:

- `Hide this user`
- `Hide this organization`
- `Not interested in this event`
- `Report moment`

These actions should feed back into ranking.

---

## Analytics

We should instrument this feed from day one.

### Core metrics

- moments-feed opens
- average session depth
- average moments viewed per session
- event detail opens from moments
- follows from moments
- saves from moments
- RSVPs from moments
- author profile opens from moments
- completion rate per moment
- skips within first second

### Ranking quality metrics

- discovery follow rate
- event open-through rate
- RSVP conversion rate
- hide / mute / report rate
- repeat-author fatigue rate

---

## Phased Rollout

### Phase 1

- dedicated bottom-nav `Moments`
- followed + public discovery mix
- full-screen vertical feed
- `View event`
- `View profile`
- `Follow`

### Phase 2

- stronger ranking
- local / nearby tuning
- organization moments weighting
- explicit "why you're seeing this" hints

### Phase 3

- personalization improvements
- learned ranking weights
- stronger moderation controls
- experimentation on feed mix

---

## Implementation Notes

### API

We will likely need a dedicated feed query, for example:

```graphql
query GetMomentsFeed($cursor: String, $limit: Int) {
  readMomentsFeed(cursor: $cursor, limit: $limit) {
    items {
      momentId
      authorId
      eventId
      ...
    }
    nextCursor
    hasMore
  }
}
```

This should not be assembled entirely client-side from multiple smaller queries. The ranking belongs in the API layer.

### Ranking implementation

Like the recommendation feed, this can begin rule-based:

- candidate generation in API
- per-item scoring
- diversity pass
- paginated read

### Mobile

The mobile app should:

- render a full-screen pager
- prefetch the next few items
- keep transitions smooth
- allow instant jump to event and profile

---

## Final Recommendation

We should build this.

Not as a sidecar feature, but as a first-class mobile destination.

The right move is:

1. replace bottom-nav `Notifications` with `Moments`
2. move notifications to a bell / inbox utility surface
3. build a vertical full-screen moments feed
4. rank it with a blend of social, local, interest, freshness, and momentum signals
5. optimize not just for time spent, but for event discovery and RSVP conversion

If done well, this becomes the mobile surface that makes Gatherle feel alive.
