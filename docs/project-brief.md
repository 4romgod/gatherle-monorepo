# Gatherle — Project Brief

## Product Overview

**Gatherle** is a social-first event discovery and management platform that helps people find exciting events and see
where their friends are going—creating natural FOMO and driving real-world participation.

Unlike traditional event platforms that focus purely on listings, Gatherle emphasizes **social context, discovery, and
momentum**, helping users decide _what to do next_ based on what’s happening around them and who’s attending.

The platform launches as a **website**, starting in **Gauteng**, with the ambition to expand nationally and eventually
globally.

---

## Vision Statement

> **Gatherle turns events into experiences you don’t want to miss—by helping people discover what’s happening around
> them and where their friends are showing up.**

---

## Problem Statement

### For Users

- Events are scattered across platforms and social media
- Discovery lacks personalization and social context
- People miss great events because they don’t know their friends are going

### For Hosts

- Promotion is expensive or inefficient
- Organic reach is limited
- Engagement before and after events is weak

---

## Target Audience

### Primary Users

- Partygoers and social event attendees (music, nightlife, lifestyle events)

### Secondary Users

- Community events
- Sports events
- Arts and cultural events
- Student and church events
- Meetups and interest-based gatherings

### Hosts

- Organizations
- Individual creators
- Event collectives

---

## Marketing & Positioning

### Launch Focus

- Launch city: **Gauteng (Johannesburg / Pretoria)** to tap into the “hustle” lifestyle—people who work hard and expect
  a weekend escape within hours, not weeks.
- Roll out with a **website-first** discovery experience that leans heavily on map/heatmap views and visual, swipe-style
  exploration instead of Meetup’s list-heavy UI.

### Niche Messaging

- **Weekend Warrior discovery:** focus on last-minute, hyper-local “now” events (rooftop sundowners, flash socials,
  underground jazz, padel/pickleball mix-ins) to solve the “missing out” problem.
- **Active & outdoors adventures:** promote curated fitness, conservancy, and trail experiences with concierge-style
  safety features (secure routes, verified venues, Live ETA buddy systems, loadshedding-aware venue status).
- **Creator & side-hustle pop-ups:** offer ticketed micro-workshops plus venue booking so creators can run
  outcome-driven sessions without juggling infrastructure.
- **Safety-first circles:** highlight programs for underrepresented or safety-conscious groups (Queer-friendly events,
  women-only hiking), a capability that Meetup and other global platforms underestimate.

### Differentiators vs. Meetup

- Pricing: pay-per-event or commission vs. Meetup’s higher monthly organizer fees.
- Focus: immediate discovery (“What’s on tonight?”) rather than long-term group management or generic communities.
- Experience: visual-first, map-driven discovery vs. data-dense directory messaging.
- Local context: embedded SA-specific features like loadshedding status, safe-route mapping, and Gauteng/Joburg
  neighborhood guides.
- Momentum: show who’s going (opt-in) and deliver FOMO, not just listings.

### Competitive Landscape

- **Meetup context:** founded 2002, acquired by Bending Spoons in Jan 2024; previously owned by WeWork (2017) and
  AlleyCorp (2020). Prior to the latest sale its revenue sat around $25–30M annually, and the current parent company
  sits between an implied $2.55B valuation (2024) and a reported $11B as it scales through acquisitions like Eventbrite
  and Vimeo.
- **Local peers:** Benchmark against Quicket, Fixr, Howler, and City of Joburg listings to spot UX gaps in social
  discovery and immediate, verified experiences.
- **Why we win:** niche focus on Gauteng energy, safety/loadshed signals, rapid event creation, and momentum-based
  discovery (e.g., padel socials, estate brunches, secret Joburg urban explorer routes).

### Tactical Next Steps

1. Draft marketing story/landing hero messaging for “Weekend Warriors” and “immediate escape” experiences anchored in
   Gauteng neighborhoods (Sandton, Rosebank, Maboneng, Victoria Yards, Midrand).
2. Curate launch event mix (padel/pickleball socials, estate adventure brunches, pop-up joburg underside experiences) to
   populate initial discovery feeds.
3. Highlight safety, verified venues, Live ETA/buddy-system, and loadshedding filters in both product copy and early
   onboarding flows.

---

## Core Value Proposition

- **For users:** Discover relevant events filtered by interest, location, and social proof.
- **For hosts:** Reach the right audience and build momentum around events.
- **For the platform:** Monetize attention and intent, not just listings.

---

## MVP Scope (Website)

### User Features

- Authentication
- Browse and search events
- Event details page
- RSVP (instant)
- Save / bookmark events
- Follow other users
- View:
  - Events I’m going to
  - Events I’m interested in
  - Events I hosted
  - Past attended events

### Social & FOMO Features

- Friends-going feed
- Personalized “For You” feed
- Trending events
- Attendee visibility (opt-in, default on)

### Host Features

- Create and manage events
- Support for multiple roles:
  - Organizers
  - Co-hosts
  - Volunteers
- Capacity limits
- Waitlists
- Event lifecycle statuses:
  - Upcoming
  - Ongoing
  - Completed
  - Cancelled

---

## Event Model (High-Level)

Events support:

- Rich metadata (media, tags, categories)
- Recurrence via iCalendar rules
- Privacy controls (public / private / invitation-only)
- Discovery visibility rules
- RSVP limits and waitlists
- Social context via resolved participants

---

## Discovery & Feed

Users can discover events through:

- Map view
- Categories
- Search
- Date filters
- Nearby events
- Friends-going
- Trending events
- Personalized “For You” feed

### Discovery Ranking Priorities

1. Proximity
2. Friends attending or interested
3. Popularity (RSVP velocity)
4. Recency / time relevance
5. Host quality
6. Paid promotion (boosted, not overriding relevance)

---

## Moderation, Trust & Safety

### MVP Phase

- Authentication required to host events
- Email verification
- Rate limits on event creation
- User and event reporting
- Soft moderation for flagged or new hosts

### Future Enhancements

- Phone verification for hosts
- Host reputation scoring
- Verified organization badges
- Automated spam and abuse detection
- Deposits or paid requirements for large events

---

## Monetization Strategy

### Short Term

- Paid promoted events (boosted visibility)

### Long Term

- Percentage of sales
- Premium tools for hosts
- Featured placements and sponsorships

---

## Technology Stack

- **Backend:** TypeScript, GraphQL (Apollo)
- **Database:** MongoDB (Mongoose / Typegoose)
- **Frontend:** Next.js
- **Authentication:** Custom / provider-based
- **Infrastructure:** AWS Lambda

---

## Timeline

- **MVP Target:** 3 months
- **Team:** Solo founder

---

## Long-Term Vision

Gatherle becomes the **social layer for real-world experiences**—a platform where people decide what to do next based on
momentum, friends, and excitement, not just static event listings.
