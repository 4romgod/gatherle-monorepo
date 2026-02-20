# Gatherle — Website Page List

This document lists all pages required for the Gatherle website, derived from the core product flowchart and feature
scope. Pages are grouped by purpose and access level.

---

## 1. Public Pages (No Authentication Required)

### 1. Landing Page (done)

**Route:** `/`

- Product value proposition
- Featured / trending events
- Primary CTAs (Browse events, Sign up)
- Social proof (popular events, locations)

---

### 2. Browse Events (done)

**Route:** `/events`

- Event feed (list / grid)
- Search
- Filters (date, location, category)
- Friends-going indicators (if logged in)
- Promoted events

---

### 3. Event Detail Page (Public View) (done)

**Route:** `/events/[slug]`

- Event hero image
- Event details (date, time, location)
- Embedded map preview that opens native navigation when clicked (with fallback button)
- Host & organizer info
- Attendee count
- CTAs:
  - Log in to RSVP
  - Save / Share
- Attendee preview showing up to three confirmed guests with visible names plus a link to the full RSVP list

---

### 3.1. Attendees List (done)

**Route:** `/events/[slug]/attendees`

- Hero summary from the parent event with shortcut back to the main detail view.
- Status overview chips for Going, Interested, and Waitlisted counts.
- Full RSVP list with avatars, usernames, and status chips so names are visible at all times.
- Private attendees are blurred unless you follow them, honoring each profile's default visibility.
- Easy path to continue interacting (share, back to event, or connect with attendees later).

---

### 4. Public User Profile (done)

**Route:** `/u/[username]`

- Public bio
- Hosted events
- Past events (if public)
- Follow user CTA

---

### 5. Public Organization Profile

**Route:** `/org/[slug]`

- Organization details
- Upcoming events
- Past events
- Follow organization CTA

---

## 2. Authentication & Onboarding

### 6. Login

**Route:** `/auth/login`

- Email / password
- OAuth (Google, Apple)

---

### 7. Sign Up

**Route:** `/auth/signup`

- Email / password
- OAuth

---

### 8. Onboarding

**Route:** `/onboarding`

- Select interests
- Set location
- Follow suggested users / hosts

---

## 3. Core Authenticated User Pages

### 9. Home / Feed (done)

**Route:** `/home`

- For You feed
- Friends going
- Trending events
- Nearby / This weekend

---

### 10. Search Results

**Route:** `/search`

- Keyword-based search
- Filtered results
- Map toggle

---

### 11. Map View

**Route:** `/map`

- Map-based event discovery
- Event pins
- Filters

---

### 12. Notifications

**Route:** `/notifications`

- RSVP confirmations
- Friend RSVPs
- Event updates
- Reminders

---

### 13. Saved Events

**Route:** `/saved`

- Bookmarked / saved events

---

### 14. My Events

**Route:** `/me/events` Tabs:

- Going
- Interested
- Hosted
- Past

---

### 15. My Profile (Settings) (done)

**Route:** `/me/profile`

- Edit bio
- Interests
- Privacy settings

---

### 16. Following / Followers

**Route:** `/me/connections`

- Following
- Followers
- Mutual connections

---

## 4. Hosting & Event Management

### 17. Create Event

**Route:** `/events/create`

- Event creation form
- Draft / Publish flow

---

## 30. Error Pages (done)

### `/404`

- Not found (missing route or asset)

### `/403`

- Access denied (unauthorized resource)

### `/500`

- Unexpected server error; friendly retry/return-home CTA

---

### 18. Edit Event

**Route:** `/events/[id]/edit`

- Update event details
- Cancel event

---

### 19. Host Dashboard

**Route:** `/host`

- Overview of hosted events
- Basic stats

---

### 20. Event Management

**Route:** `/host/events/[id]`

- RSVP list
- Waitlist
- Attendee management
- Event analytics

---

## 5. Organization Pages

### 21. Organization Dashboard

**Route:** `/org/[slug]/dashboard`

- Organization events
- Members
- Roles

---

### 22. Organization Settings

**Route:** `/org/[slug]/settings`

- Organization profile
- Permissions
- Billing (future)

---

## 6. Monetization (Future-Facing)

### 23. Promote Event

**Route:** `/events/[id]/promote`

- Promotion options
- Budget & duration
- Performance preview

---

## 7. Moderation & Safety

### 24. Report Flow

**Route:** `/report`

- Report event
- Report user

---

### 25. Moderation Review (Admin)

**Route:** `/admin/moderation`

- Flagged events
- Flagged users

---

## 8. Admin & Internal Tools

### 26. Admin Dashboard

**Route:** `/admin`

- Platform metrics
- User growth
- Event activity

---

### 27. Category Management

**Route:** `/admin/categories`

- Create / edit event categories

---

### 28. Promotions Admin

**Route:** `/admin/promotions`

- Review promoted events
- Approvals and controls

---

## 9. System & Utility Pages

### 29. Settings

**Route:** `/settings`

- Account settings
- Notification preferences
- Privacy controls

---

### 30. Error Pages

- `/404` — Not found
- `/403` — Access denied
- `/500` — Server error

---

## 10. Optional (Later)

### 31. Help / Support

**Route:** `/help`

---

### 32. Legal Pages

- `/terms`
- `/privacy`

---

## Summary

- **MVP Core Pages:** ~14–16
- **v1 Full Platform:** ~22–25
- **Including Admin & Future:** ~30+

This structure balances ambition with realism for a solo-built, 3-month MVP.

- Easy path to continue interacting (share, back to event, or message attendees later).
- Easy path to continue interacting (share, back to event, or connect with attendees later).
