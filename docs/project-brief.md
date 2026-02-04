# Ntlango — Project Brief

## Product Overview

**Ntlango** is a social-first event discovery and management platform that helps people find exciting events and see
where their friends are going—creating natural FOMO and driving real-world participation.

Unlike traditional event platforms that focus purely on listings, Ntlango emphasizes **social context, discovery, and
momentum**, helping users decide _what to do next_ based on what’s happening around them and who’s attending.

The platform launches as a **website**, starting in **Gauteng**, with the ambition to expand nationally and eventually
globally.

---

## Vision Statement

> **Ntlango turns events into experiences you don’t want to miss—by helping people discover what’s happening around them
> and where their friends are showing up.**

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

Ntlango becomes the **social layer for real-world experiences**—a platform where people decide what to do next based on
momentum, friends, and excitement, not just static event listings.
