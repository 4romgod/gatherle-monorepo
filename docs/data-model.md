# Domain Data Model

This document captures the current data model for Ntlango’s event platform as implemented in the backend, plus the near-term gaps we expect to fill. All types referenced here map to TypeGraphQL/Typegoose classes in `packages/commons/lib/types` and are persisted via Mongoose models in `apps/api/lib/mongodb/models`.

## Core Goals
- Support individuals and organizations hosting repeatable and one-off experiences.
- Keep participation (RSVP/tickets) auditable over time.
- Allow growth into paid tickets, invites, waitlists, and richer engagement.
- Enable a social layer that creates FOMO: users see where friends and followed orgs are going, with privacy-aware visibility.

## Implementation Status

**Implemented today**
- User, Event, EventCategory, EventCategoryGroup
- EventParticipant
- Organization, OrganizationMembership, Venue
- Follow, Intent, Activity

**Planned/partial**
- TicketType, Invitation, WaitlistEntry
- Comment, Reaction, Audit Trail

## Entities (Current Implementation)

### Visual overview
The following Mermaid class diagram summarizes the primary relationships among the persisted entities (the Excalidraw file has a richer layout if you prefer a canvas view).

```mermaid
classDiagram
    class Event {
        +string eventId
        +string slug
        +EventStatus status
        +EventVisibility visibility
        +string recurrenceRule
        +Location location
        +EventOrganizer[] organizers
        +Ref<EventCategory>[] eventCategoryList
    }
    class EventCategory {
        +string eventCategoryId
        +string slug
        +string name
        +string? color
    }
    class EventCategoryGroup {
        +string eventCategoryGroupId
        +string name
        +string slug
    }
    class Organization {
        +string orgId
        +string slug
        +string name
    }
    class Venue {
        +string venueId
        +VenueType type
    }
    class User {
        +string userId
        +string email
        +string username
    }
    class EventOrganizer {
        +string userId
        +EventOrganizerRole role
    }
    class EventParticipant {
        +string participantId
        +string eventId
        +string userId
        +ParticipantStatus status
    }
    class Intent {
        +string intentId
        +string eventId
        +string userId
        +IntentStatus status
    }
    class Activity {
        +string activityId
        +string actorId
        +ActivityVerb verb
    }
    class Follow {
        +string followId
        +string followerUserId
    }

    Event "1" --> "many" EventCategory : references
    Event "1" --> "many" EventCategoryGroup : groups
    Event "many" --> "1" Organization : ownedBy
    Event "0..1" --> "1" Venue : at
    Event "1" --> "many" EventOrganizer : includes
    Event "1" --> "many" EventParticipant : resolved
    EventOrganizer "many" --> "1" User : userId
    EventParticipant "many" --> "1" User : userId
    Intent "many" --> "1" Event : references
    Intent "many" --> "1" User : references
    Activity "many" --> "1" Event : references
    Activity "many" --> "1" User : actor
    Follow "many" --> "1" User : follower
    Follow "many" --> "1" Organization : target
```

### User
The `User` model represents every person that authenticates with the platform—it drives access control, identity, and personalized behavior (feeds, RSVPs, follows) so other collections can tie metadata back to a real person.
- `userId`, `email`, `username`, `userRole`, optional `roles[]`.
- Profile fields: `given_name`, `family_name`, `birthdate`, `gender`, `phone_number`, `profile_picture`, `bio`.
- `address` (freeform JSON) plus `interests` (EventCategory refs).
- Social & visibility: `primaryTimezone`, `defaultVisibility`, `socialVisibility`, `shareRSVPByDefault`, `shareCheckinsByDefault`, `mutedUserIds`, `blockedUserIds`.
- Structured profile: `profile { displayName, bio, avatar, socialLinks[] }`.
- Preferences: `preferences { communicationPrefs, notificationPrefs }`.

### Organization
Organizations capture a workspace context for events—defaults for visibility/billing, ownership, and followable state—so individuals can operate together without mixing personas.
- `orgId`, `slug`, `name`, `description`, `logo`, `ownerId`.
- `defaultVisibility`, `billingEmail`, `links[]`, `domainsAllowed[]`.
- `eventDefaults { visibility, remindersEnabled, waitlistEnabled, allowGuestPlusOnes, ticketAccess }`.
- `allowedTicketAccess` (Public|Members|InviteOnly).
- Social: `followersCount`, `isFollowable`, `tags[]`.
- Memberships are stored in `OrganizationMembership` (see below) and resolved in GraphQL.

### OrganizationMembership
Tracks which users belong to which organizations plus their role, so permission checks know who can create/publish events or manage billing for that org.
- `membershipId`, `orgId`, `userId`, `role` (Owner|Admin|Host|Moderator|Member), `joinedAt`.
- Enforces uniqueness per `(orgId, userId)`.

### Venue
Stores reusable meeting spaces for events, including geolocation/address data so the UI and notifications can render consistent location details regardless of who creates the event.
- `venueId`, optional `orgId`, `type` (Physical|Virtual|Hybrid), `name`.
- `address { street, city, region, country, postalCode }`.
- `geo { latitude, longitude }`.
- `url`, `capacity`, `amenities[]`.

### EventCategory
Lightweight taxonomy entries that label events and users for filtering, preferences, and follow features; stored once and referenced via `eventCategoryList` and `interests`.
- `eventCategoryId`, `slug`, `name`, `iconName`, `description`, optional `color`.

### EventCategoryGroup
Groups of categories for UI/curation purposes (e.g., “Music” or “Community”) so we can surface healthy category hierarchies without hardcoding them into business logic.
- `eventCategoryGroupId`, `name`, `slug`, `eventCategoryList[]`.

### Location (embedded in Event)
Embeds the spatial context of an event without separating it into its own collection, so each Event owns a snapshot of where it will happen (useful for recurrence, history, and location changes).
- `locationType`: `venue` | `online` | `tba`.
- `coordinates { latitude, longitude }`.
- `address { street, city, state, postalCode, country }`.
- `details` (string) for arbitrary location notes.

### Event
The `Event` document is the heart of the platform—taking organizer intent, location, schedules, and metadata and storing it as a single source of truth for listing feeds and resolver pipelines.
- Identity: `eventId`, `slug`, `orgId?`.
- Content: `title`, `summary`, `description`, `heroImage`, `media`, `mediaAssets[]`.
- Status: `status` (Cancelled|Completed|Ongoing|Upcoming).
- Lifecycle: `lifecycleStatus` (Draft|Published|Cancelled|Completed).
- Visibility: `visibility` (Public|Private|Unlisted|Invitation), `privacySetting` (Public|Private|Invitation).
- Schedule: `recurrenceRule` (required), plus `primarySchedule? { startAt, endAt, timezone, recurrenceRule }` and `occurrences?[]`.
- Location: `location` (Location type above), `venueId?` and `locationSnapshot?`.
- People: `organizers [{ userId, role: Host|CoHost|Volunteer }]`.
- Taxonomy: `eventCategoryList[]` (EventCategory refs) for flattened ids.
- Settings: `capacity`, `rsvpLimit`, `waitlistEnabled`, `allowGuestPlusOnes`, `remindersEnabled`, `showAttendees`.
- Metadata:
  - `tags` (JSON): free-form tagging for search and discovery. Typically an array of strings or lightweight tag objects, for example:
    - `["family-friendly", "outdoors", "live-music"]`
    - `[{ "key": "audience", "value": "families" }, { "key": "vibe", "value": "chill" }]`
  - `additionalDetails` (JSON): arbitrary, event-specific key–value metadata not modeled as first-class fields. Expected to be a shallow object whose values are JSON-serializable, for example:
    - `{ "dressCode": "casual", "parkingInfo": "street + garage", "language": "en" }`
    - `{ "sponsor": { "name": "Acme Corp", "tier": "gold" } }`
  - `comments` (JSON): reserved for inline or system-generated comments associated with the event. May be unused in some deployments. When used, it is typically an array of comment objects that reference users rather than storing full user data, for example:
    - `[{"userId": "u123", "text": "Doors open at 7pm", "createdAt": "2024-01-01T18:00:00Z"}]`
  - `eventLink`: canonical URL for the event’s public landing page (may point to an internal or external site).
- `participants` is resolved by GraphQL via `EventParticipant` and is not stored on the Event document.

### EventParticipant
Event participants are stored separately so RSVP/attendance history can be audited, shared visibility honored, and quantities tracked without mutating the Event document frequently.
- `participantId`, `eventId`, `userId`, `status` (Interested|Going|Waitlisted|Cancelled|CheckedIn).
- `quantity`, `invitedBy`, `sharedVisibility` (Public|Followers|Private).
- `rsvpAt`, `cancelledAt`, `checkedInAt`.

### Follow
Follow entries model the social graph edges, letting the feed/caching layer enforce muted or asynchronous follow relationships without denormalizing user objects.
- `followId`, `followerUserId`, `targetType` (User|Organization), `targetId`.
- `status` (Active|Muted), `createdAt`.

### Intent
Intents are lightweight signals (Interested, Going, etc.) that are cheaper to write/read than EventParticipant rows and feed the UI before tickets are confirmed.
- `intentId`, `userId`, `eventId`, optional `participantId`.
- `status` (Interested|Going|Maybe|Declined).
- `visibility` (Public|Followers|Private), `source` (Manual|Ticket|Invite|OrgAnnouncement).
- `metadata` (JSON), `createdAt`, `updatedAt`.

### Activity
Activities capture actions taken by actors (users/orgs) so the feed knows what happened, when, and how visible the story should be.
- `activityId`, `actorId`, `verb` (Followed|RSVPd|Commented|Published|CreatedOrg|CheckedIn|Invited).
- `objectType` (User|Organization|Event|Comment|TicketType), `objectId`.
- `targetType?`, `targetId?`, `visibility` (Public|Followers|Private), `eventAt`, `metadata`.

## Planned Entities & Extensions

### TicketType (planned)
- Price and access controls to formalize paid tickets: `ticketTypeId`, `eventId`, `name`, `description`, `price`, `currency`, `capacity`, `salesWindow`, `access`, `perUserLimit`, `refundableUntil`, `addons`.

### Invitation / WaitlistEntry (planned)
- Invitations: `inviteId`, `eventId`, `email|userId`, `status`, `sentAt`, `respondedAt`, `role?`.
- Waitlist: `waitlistEntryId`, `eventId`, `userId`, `priority`, `createdAt`.

### Comment / Reaction / AuditTrail (planned)
- Dedicated collections to replace the current `Event.comments` JSON payloads.
- Audit entries for tracking field-level changes on Event.

## Privacy & Visibility Rules
- User defaults: `socialVisibility`, `shareRSVPByDefault`, `shareCheckinsByDefault`.
- EventParticipant `sharedVisibility` determines attendee visibility in feeds and event pages.
- Follow status `Muted` suppresses feed items while keeping the edge.
- Event `showAttendees` hides attendee lists from non-organizers; counts can still be exposed.

## GraphQL Query Patterns
- List queries accept `QueryOptionsInput` (`pagination`, `sort`, `filters`) and are translated into Mongo aggregation pipelines.
- Ownership checks for sensitive mutations live in `apps/api/lib/utils/auth.ts` and rely on `OPERATION_NAMES` for enforcement.

## Feed & FOMO Flow
1) User follows User/Organization → `Follow` created, `Activity: Followed`.
2) User marks Going/Interested → `Intent` created/updated; if RSVP/ticketed, `EventParticipant` is upserted.
3) Feed query pulls Activities where:
   - actor is in my follow set, and
   - activity visibility allows (Public or Followers when I follow), and
   - I’m not blocking/muting the actor/org.
4) Event detail can show “Friends going” via intersecting my follow set with visible Intents/Participants.

## Mongo/NoSQL Adaptation Strategy (current)
- **Reference + resolve:** Most relationships are stored as IDs and resolved in GraphQL (e.g., Event → EventParticipant, Organization → OrganizationMembership).
- **Use JSON for flexible fields:** `tags`, `additionalDetails`, `comments`, and several metadata blobs are stored as JSON to move fast.
- **Indexes (implemented):**
  - Event: `eventId`, `slug` are unique; `eventCategoryList` is populated for reads.
  - EventParticipant: unique `{eventId, userId}`.
  - Organization: unique `slug`.
  - OrganizationMembership: unique `{orgId, userId}`.
  - Follow: unique `{followerUserId, targetType, targetId}`.
  - Intent: unique `{userId, eventId}`.
  - Activity: index `{actorId, eventAt}`.

## Suggested Next Steps
- Replace `Event.comments` JSON with `Comment` and `Reaction` collections and wire up resolvers.
- Introduce `TicketType`, `Invitation`, and `WaitlistEntry` types + DAOs + resolvers.
- Add projections/denormed summary fields for high-traffic reads (event title/org info on Activity).
- Capture `locationSnapshot` consistently for published events to preserve historical data.
