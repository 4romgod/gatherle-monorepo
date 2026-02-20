# Services Architecture

**Date:** 19 January 2026  
**Status:** 📋 Proposal

---

## Overview

This document outlines the introduction of a **Service Layer** in the API architecture. Services encapsulate business
logic, coordinate between multiple DAOs, and handle cross-cutting concerns like notifications, emails, and caching.

---

## Current Architecture

```
┌─────────────────┐
│    Resolver     │  ← GraphQL entry point
├─────────────────┤
│   Validation    │  ← Zod schemas
├─────────────────┤
│      DAO        │  ← Database operations
├─────────────────┤
│     Model       │  ← Mongoose/Typegoose
└─────────────────┘
```

**Current Flow:**

1. Resolver receives request
2. Resolver validates input
3. Resolver calls DAO directly
4. Resolver returns result

**Problems with current approach:**

- Business logic scattered across resolvers
- Resolvers become bloated with conditional logic
- Hard to reuse logic across multiple resolvers
- Cross-cutting concerns (notifications, emails) tightly coupled
- Difficult to test business logic in isolation

---

## Proposed Architecture

```
┌─────────────────┐
│    Resolver     │  ← GraphQL entry point (thin layer)
├─────────────────┤
│    Service      │  ← Business logic, orchestration
├─────────────────┤
│      DAO        │  ← Data access only
├─────────────────┤
│     Model       │  ← Mongoose/Typegoose
└─────────────────┘
```

**New Flow:**

1. Resolver receives request and validates input
2. Resolver calls Service method
3. Service executes business logic
4. Service calls one or more DAOs
5. Service triggers side effects (notifications, emails)
6. Resolver returns result

---

## Service Layer Benefits

| Benefit                    | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| **Separation of concerns** | Resolvers handle GraphQL, services handle business logic                |
| **Reusability**            | Same service method callable from multiple resolvers or background jobs |
| **Testability**            | Business logic testable without GraphQL layer                           |
| **Side effects**           | Centralized place for notifications, emails, analytics                  |
| **Transaction management** | Services can coordinate multi-DAO operations                            |

---

## When to Use Services vs DAOs

Not all resolver methods need to go through a service. The decision depends on whether **side effects** or **complex
orchestration** are involved.

### Decision Guide

| Use Case                                                           | Call                    | Example                                     |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------------------- |
| **Mutations with side effects** (notifications, emails, analytics) | Service → DAO           | `FollowService.follow()` sends notification |
| **Mutations with multi-entity coordination**                       | Service → multiple DAOs | Creating event + scheduling reminders       |
| **Complex business validation**                                    | Service → DAO           | Checking blocks, permissions, limits        |
| **Simple read queries**                                            | DAO directly            | `FollowDAO.readFollowers()`                 |
| **Simple CRUD without side effects**                               | DAO directly            | `NotificationDAO.markAsRead()`              |
| **Field resolvers**                                                | DAO or DataLoader       | Loading related entities                    |

### Current Implementation Examples

**FollowResolver:**

```typescript
// ✅ Mutations → Service (sends notifications)
async follow(input) {
  return FollowService.follow({...input, followerUserId: user.userId});
}

// ✅ Queries → DAO directly (no side effects)
async readFollowers(targetType, targetId) {
  return FollowDAO.readFollowers(targetType, targetId);
}
```

**EventParticipantResolver:**

```typescript
// ✅ Mutations → Service (sends notifications to event host)
async upsertEventParticipant(input) {
  return EventParticipantService.rsvp(input);
}

// ✅ Queries → DAO directly (pure data retrieval)
async readEventParticipants(eventId) {
  return EventParticipantDAO.readByEvent(eventId);
}
```

**NotificationResolver:**

```typescript
// ✅ Queries → DAO directly (just fetching data)
async notifications(context, limit, cursor) {
  return NotificationDAO.readByUserId(user.userId, {limit, cursor});
}

// ✅ Mutations → DAO directly (no additional side effects needed)
async markNotificationRead(notificationId) {
  return NotificationDAO.markAsRead(notificationId, user.userId);
}
```

### The Principle

> **Services exist for orchestration and side effects.**  
> If a resolver method just fetches or updates data without triggering notifications, emails, or coordinating multiple
> entities, calling the DAO directly is cleaner and avoids unnecessary abstraction.

### When to Create a New Service

Create a service when you need to:

1. **Send notifications** as part of an operation
2. **Coordinate multiple DAOs** in a single transaction
3. **Enforce complex business rules** beyond simple validation
4. **Trigger background jobs** (emails, webhooks, analytics)
5. **Reuse logic** across multiple resolvers or entry points

Don't create a service just for:

- Simple CRUD operations
- Read-only queries
- Operations with no side effects

---

## Planned Services

### NotificationService

**Status:** ✅ Implemented

Handles creation and delivery of all notifications.

```typescript
class NotificationService {
  // Create in-app notification
  static async notify(params: NotifyParams): Promise<Notification>;

  // Bulk notify (e.g., all event attendees)
  static async notifyMany(recipientIds: string[], params: NotifyParams): Promise<void>;

  // Future: dispatch to email/push based on preferences
  private static async dispatchToChannels(notification: Notification): Promise<void>;
}
```

### AuthService

**Status:** 📋 Planned

Centralizes authentication and authorization logic.

```typescript
class AuthService {
  // Login with credentials
  static async login(email: string, password: string): Promise<AuthResult>;

  // Register new user
  static async register(input: CreateUserInput): Promise<AuthResult>;

  // Password reset flow
  static async requestPasswordReset(email: string): Promise<void>;
  static async resetPassword(token: string, newPassword: string): Promise<void>;

  // Token management
  static async refreshToken(token: string): Promise<string>;
  static async revokeToken(token: string): Promise<void>;
}
```

### EmailService

**Status:** 📋 Planned

Handles all transactional email sending.

```typescript
class EmailService {
  // Send single email
  static async send(to: string, template: EmailTemplate, data: object): Promise<void>;

  // Send bulk emails
  static async sendBulk(recipients: EmailRecipient[], template: EmailTemplate): Promise<void>;

  // Scheduled emails (digests, reminders)
  static async scheduleEmail(params: ScheduledEmailParams): Promise<void>;
}
```

### EventService

**Status:** 📋 Planned

Orchestrates event-related operations beyond simple CRUD.

```typescript
class EventService {
  // Create event with all side effects
  static async createEvent(input: CreateEventInput, organizerId: string): Promise<Event>;

  // Cancel event and notify all attendees
  static async cancelEvent(eventId: string, reason?: string): Promise<Event>;

  // Update event and notify attendees of changes
  static async updateEvent(eventId: string, input: UpdateEventInput): Promise<Event>;

  // Schedule reminders for upcoming event
  static async scheduleReminders(eventId: string): Promise<void>;
}
```

### EventParticipantService

**Status:** ✅ Implemented

Handles event RSVP and check-in with notifications to event host.

```typescript
class EventParticipantService {
  // RSVP to event with notification to host
  static async rsvp(input: UpsertEventParticipantInput): Promise<EventParticipant>;

  // Cancel RSVP (no notification)
  static async cancel(input: CancelEventParticipantInput): Promise<EventParticipant>;

  // Check-in with notification to host
  static async checkIn(eventId: string, userId: string): Promise<EventParticipant>;
}
```

### FollowService

**Status:** ✅ Implemented

Handles follow logic including blocking and muting.

```typescript
class FollowService {
  // Follow user/org with notification
  static async follow(followerId: string, targetType: FollowTargetType, targetId: string): Promise<Follow>;

  // Unfollow
  static async unfollow(followerId: string, targetType: FollowTargetType, targetId: string): Promise<void>;

  // Accept/reject follow request with notification
  static async respondToRequest(followId: string, userId: string, accept: boolean): Promise<Follow>;

  // Block user (and remove any existing follows)
  static async blockUser(blockerId: string, blockedId: string): Promise<void>;

  // Mute user (hide their activity without unfollowing)
  static async muteUser(muterId: string, mutedId: string): Promise<void>;
}
```

### SearchService

**Status:** 📋 Future

Unified search across all entities.

```typescript
class SearchService {
  // Search events, users, organizations
  static async search(query: string, filters?: SearchFilters): Promise<SearchResult>;

  // Autocomplete suggestions
  static async suggest(query: string, types: EntityType[]): Promise<Suggestion[]>;
}
```

### RecommendationService

**Status:** 📋 Future

Personalized recommendations based on user interests and behavior.

```typescript
class RecommendationService {
  // Get recommended events for user
  static async getRecommendedEvents(userId: string, limit: number): Promise<Event[]>;

  // Get suggested users to follow
  static async getSuggestedUsers(userId: string, limit: number): Promise<User[]>;

  // Get trending events
  static async getTrendingEvents(location?: Location): Promise<Event[]>;
}
```

### MediaService

**Status:** 📋 Future

Handles file uploads and image processing.

```typescript
class MediaService {
  // Upload and process image
  static async uploadImage(file: Upload, options?: ImageOptions): Promise<MediaResult>;

  // Generate thumbnails
  static async generateThumbnails(mediaId: string): Promise<void>;

  // Delete media
  static async deleteMedia(mediaId: string): Promise<void>;
}
```

---

## Migration Candidates

The following existing features have business logic in resolvers that should be migrated to services:

### High Priority

| Feature               | Current Location                | Reason to Migrate                                                          |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| **Follow system**     | `resolvers/follow.ts`           | Complex logic: blocking checks, approval workflow, now needs notifications |
| **Event RSVP**        | `resolvers/eventParticipant.ts` | Needs to trigger notifications to organizer                                |
| **User registration** | `resolvers/user.ts`             | Could trigger welcome email, verification flow                             |

### Medium Priority

| Feature                     | Current Location                      | Reason to Migrate                                 |
| --------------------------- | ------------------------------------- | ------------------------------------------------- |
| **Event creation**          | `resolvers/event.ts`                  | Could notify followers of org, schedule reminders |
| **Password update**         | `resolvers/user.ts`                   | Should send security notification email           |
| **Organization membership** | `resolvers/organizationMembership.ts` | Invite notifications, role change notifications   |

### Lower Priority (Future)

| Feature          | Current Location             | Reason                  |
| ---------------- | ---------------------------- | ----------------------- |
| Profile updates  | `resolvers/user.ts`          | Currently simple CRUD   |
| Venue management | `resolvers/venue.ts`         | Currently simple CRUD   |
| Event categories | `resolvers/eventCategory.ts` | Admin-only, simple CRUD |

---

## File Structure

```
apps/api/lib/
├── services/
│   ├── index.ts
│   ├── notification.ts
│   ├── auth.ts
│   ├── email.ts
│   ├── event.ts
│   ├── follow.ts
│   └── ...
├── graphql/
│   └── resolvers/        # Thin layer, delegates to services
├── mongodb/
│   └── dao/              # Data access only, no business logic
└── ...
```

---

## Implementation Guidelines

### Service Structure

```typescript
// services/follow.ts
import { NotificationService } from './notification';
import { FollowDAO, UserDAO } from '@/mongodb/dao';
import { NotificationType } from '@gatherle/commons/types';

export class FollowService {
  static async follow(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string
  ): Promise<Follow> {
    // 1. Validate business rules
    await this.validateFollowRequest(followerId, targetType, targetId);

    // 2. Determine approval status based on target's policy
    const approvalStatus = await this.determineApprovalStatus(targetType, targetId);

    // 3. Create follow record
    const follow = await FollowDAO.upsert({
      followerUserId: followerId,
      targetType,
      targetId,
      approvalStatus,
    });

    // 4. Send notification
    if (targetType === FollowTargetType.User) {
      await NotificationService.notify({
        type: approvalStatus === FollowApprovalStatus.Accepted
          ? NotificationType.FOLLOW_RECEIVED
          : NotificationType.FOLLOW_REQUEST,
        recipientUserId: targetId,
        actorUserId: followerId,
        targetType: 'User',
        targetId: followerId,
      });
    }

    return follow;
  }

  private static async validateFollowRequest(...) { ... }
  private static async determineApprovalStatus(...) { ... }
}
```

### Resolver Using Service

```typescript
// resolvers/follow.ts
@Resolver(() => Follow)
export class FollowResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Follow)
  async follow(@Arg('input') input: CreateFollowInput, @Ctx() context: ServerContext): Promise<Follow> {
    validateInput(CreateFollowInputSchema, input);
    const user = getAuthenticatedUser(context);

    // Delegate to service - resolver stays thin
    return FollowService.follow(user.userId, input.targetType, input.targetId);
  }
}
```

---

## Migration Strategy

1. **Start with NotificationService** - New feature, no migration needed
2. **Create FollowService** - Extract logic from resolver, add notification calls
3. **Create EventService** - Add RSVP/check-in notifications
4. **Create AuthService** - Consolidate auth logic, add security notifications
5. **Remaining services** - As features require them

Each migration should:

- Keep the resolver interface unchanged (no breaking GraphQL changes)
- Add comprehensive tests for the service
- Update the resolver to delegate to the service
- Remove business logic from the DAO if any leaked there

---

## Testing Services

Services are easier to test than resolvers because they don't require GraphQL context:

```typescript
// services/__tests__/follow.test.ts
describe('FollowService', () => {
  beforeEach(() => {
    jest.spyOn(FollowDAO, 'upsert').mockResolvedValue(mockFollow);
    jest.spyOn(NotificationService, 'notify').mockResolvedValue(mockNotification);
  });

  it('should create follow and send notification', async () => {
    const result = await FollowService.follow('user1', FollowTargetType.User, 'user2');

    expect(FollowDAO.upsert).toHaveBeenCalledWith({...});
    expect(NotificationService.notify).toHaveBeenCalledWith({
      type: NotificationType.FOLLOW_RECEIVED,
      recipientUserId: 'user2',
      actorUserId: 'user1',
      ...
    });
  });
});
```
