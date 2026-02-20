# Notifications System

**Date:** 19 January 2026  
**Status:** 📋 Planning  
**Feature:** In-App & Push Notifications

---

## Overview

This document covers the notification system for Gatherle, including notification types, delivery channels, data
architecture, and implementation details for push notifications.

---

## Delivery Channels

Notifications are delivered through three channels based on user preferences and notification priority:

| Channel    | Description                           | Use Case                            |
| ---------- | ------------------------------------- | ----------------------------------- |
| **In-App** | Bell icon with dropdown, unread badge | All notifications (primary)         |
| **Email**  | Sent to registered email address      | Digests, security alerts, reminders |
| **Push**   | Browser/mobile push notifications     | Real-time alerts when app is closed |

### Channel Selection Matrix

| Notification Type           | In-App | Email     | Push     |
| --------------------------- | ------ | --------- | -------- |
| Social (follows, mentions)  | ✅     | Optional  | Optional |
| Event reminders             | ✅     | ✅        | ✅       |
| Event updates/cancellations | ✅     | ✅        | ✅       |
| Security alerts             | ✅     | ✅ Always | ❌       |
| Friend activity             | ✅     | ❌        | Optional |
| Comments & engagement       | ✅     | Optional  | Optional |

---

## Notification Types

### Social Actions

| Type              | Trigger                                                 | Recipient      |
| ----------------- | ------------------------------------------------------- | -------------- |
| `FOLLOW_RECEIVED` | Someone follows you                                     | Followed user  |
| `FOLLOW_REQUEST`  | Follow request when `followPolicy` is `RequireApproval` | Target user    |
| `FOLLOW_ACCEPTED` | Your follow request approved                            | Requester      |
| `MENTION`         | @username in comment/post                               | Mentioned user |

### Event Interactions

| Type                   | Trigger                         | Recipient                                     |
| ---------------------- | ------------------------------- | --------------------------------------------- |
| `EVENT_RSVP`           | Someone RSVPs to your event     | **All event organizers** (Host, CoHost, etc.) |
| `EVENT_SAVED`          | Someone saves your event        | All event organizers                          |
| `EVENT_CHECKIN`        | Someone checks in to your event | **All event organizers** (Host, CoHost, etc.) |
| `EVENT_REMINDER_24H`   | 24 hours before event           | RSVP'd/saved users                            |
| `EVENT_REMINDER_1H`    | 1 hour before event             | RSVP'd/saved users                            |
| `EVENT_UPDATED`        | Event details changed           | RSVP'd/saved users                            |
| `EVENT_CANCELLED`      | Event cancelled                 | RSVP'd/saved users                            |
| `EVENT_RECOMMENDATION` | New event matches interests     | Users with matching interests                 |

#### Event Organizer Notifications: Design Decision

**Why all organizers receive notifications (not just the Host):**

1. **Shared responsibility** - Co-hosts and other organizers are invested in the event's success and should stay
   informed about activity
2. **Coverage** - If the host is busy or offline, other organizers can still monitor RSVPs and check-ins
3. **Small teams** - Organizer lists are typically small (2-5 people), so notification volume is manageable
4. **Opt-in by design** - Anyone listed as an organizer explicitly chose to be involved in the event

**Potential concern:** For very popular events with many RSVPs, this could become noisy for organizers.

**Future improvements to address this:**

- [ ] **Notification batching** - "5 new RSVPs in the last hour" instead of individual notifications
- [ ] **Per-user notification preferences** - Allow organizers to opt out of certain event notification types
- [ ] **Per-event settings** - Event-level toggle for "notify co-organizers about activity"
- [ ] **Digest mode** - Daily/weekly summary of event activity instead of real-time notifications
- [ ] **Quiet hours** - Respect user's do-not-disturb preferences

### Organization Actions

| Type                  | Trigger                       | Recipient     |
| --------------------- | ----------------------------- | ------------- |
| `ORG_INVITE`          | Invited to join organization  | Invited user  |
| `ORG_ROLE_CHANGED`    | Role changed (member → admin) | Affected user |
| `ORG_EVENT_PUBLISHED` | Followed org publishes event  | Org followers |

### Friend Activity

| Type             | Trigger               | Recipient | Condition                        |
| ---------------- | --------------------- | --------- | -------------------------------- |
| `FRIEND_RSVP`    | Friend RSVPs to event | Followers | `shareRSVPByDefault` enabled     |
| `FRIEND_CHECKIN` | Friend checks in      | Followers | `shareCheckinsByDefault` enabled |

### Comments & Engagement

| Type               | Trigger                    | Recipient          |
| ------------------ | -------------------------- | ------------------ |
| `COMMENT_RECEIVED` | Comment on your event      | Event organizer    |
| `COMMENT_REPLY`    | Reply to your comment      | Original commenter |
| `COMMENT_LIKED`    | Someone liked your comment | Comment author     |

### Account & Security

| Type               | Trigger                        | Recipient     | Channel        |
| ------------------ | ------------------------------ | ------------- | -------------- |
| `PASSWORD_CHANGED` | Password updated               | Account owner | Email (forced) |
| `NEW_DEVICE_LOGIN` | Login from new device/location | Account owner | Email (forced) |
| `ACCOUNT_VERIFIED` | Email/phone verified           | Account owner | In-app         |

---

## Data Model

### Notification Entity

```typescript
@ObjectType('Notification')
class Notification {
  notificationId: string;
  recipientUserId: string;
  type: NotificationType; // Enum of all types above
  title: string;
  message: string;

  // References
  actorUserId?: string; // Who triggered the notification
  targetType?: 'Event' | 'User' | 'Organization' | 'Comment';
  targetId?: string;

  // State
  isRead: boolean;
  readAt?: Date;

  // Delivery tracking
  emailSent: boolean;
  pushSent: boolean;

  createdAt: Date;
}
```

### NotificationType Enum

```typescript
enum NotificationType {
  // Social
  FOLLOW_RECEIVED = 'FOLLOW_RECEIVED',
  FOLLOW_REQUEST = 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED = 'FOLLOW_ACCEPTED',
  MENTION = 'MENTION',

  // Events
  EVENT_RSVP = 'EVENT_RSVP',
  EVENT_SAVED = 'EVENT_SAVED',
  EVENT_CHECKIN = 'EVENT_CHECKIN',
  EVENT_REMINDER_24H = 'EVENT_REMINDER_24H',
  EVENT_REMINDER_1H = 'EVENT_REMINDER_1H',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_RECOMMENDATION = 'EVENT_RECOMMENDATION',

  // Organizations
  ORG_INVITE = 'ORG_INVITE',
  ORG_ROLE_CHANGED = 'ORG_ROLE_CHANGED',
  ORG_EVENT_PUBLISHED = 'ORG_EVENT_PUBLISHED',

  // Friend Activity
  FRIEND_RSVP = 'FRIEND_RSVP',
  FRIEND_CHECKIN = 'FRIEND_CHECKIN',

  // Comments
  COMMENT_RECEIVED = 'COMMENT_RECEIVED',
  COMMENT_REPLY = 'COMMENT_REPLY',
  COMMENT_LIKED = 'COMMENT_LIKED',

  // Security
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  NEW_DEVICE_LOGIN = 'NEW_DEVICE_LOGIN',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
}
```

---

## User Preferences

Users control notification delivery via `preferences.communicationPrefs`:

```typescript
interface CommunicationPrefs {
  emailEnabled: boolean; // Receive email notifications
  pushEnabled: boolean; // Receive push notifications
}
```

**Note:** Security notifications (password change, new login) always send email regardless of preferences.

---

## Push Notifications

### Technology Stack

| Component      | Technology             | Purpose                            |
| -------------- | ---------------------- | ---------------------------------- |
| Browser API    | Web Push API           | Send push to browsers              |
| Service Worker | `sw.js`                | Handle push events when app closed |
| Backend        | `web-push` npm package | Generate and send push messages    |
| Key Storage    | AWS Secrets Manager    | Store VAPID keys securely          |

### Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   API       │────▶│  Push       │
│   (Client)  │     │   Server    │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 1. Request        │                   │
       │    permission     │                   │
       │                   │                   │
       │ 2. Subscribe      │                   │
       │    (get endpoint) │                   │
       │                   │                   │
       │ 3. Send           │                   │
       │    subscription ─▶│                   │
       │                   │ 4. Store          │
       │                   │    subscription   │
       │                   │                   │
       │                   │ 5. When event ───▶│
       │                   │    occurs, send   │
       │                   │    push payload   │
       │◀──────────────────│───────────────────│
       │ 6. Service worker │                   │
       │    receives push  │                   │
       │    shows notif    │                   │
```

### Implementation Steps

#### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys authenticate the server with push services.

```bash
npx web-push generate-vapid-keys
```

Store in AWS Secrets Manager:

- `VAPID_PUBLIC_KEY` - shared with client
- `VAPID_PRIVATE_KEY` - server only
- `VAPID_SUBJECT` - mailto:support@gatherle.com

#### 2. Client-Side Setup

**Service Worker (`public/sw.js`):**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/logo-img.png',
      badge: '/badge-icon.png',
      tag: data.notificationId,
      data: {
        url: data.actionUrl,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
```

**Subscription Hook (`usePushNotifications.ts`):**

```typescript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send subscription to backend
  await savePushSubscription(subscription.toJSON());
}
```

#### 3. Backend Setup

**PushSubscription Entity:**

```typescript
@ObjectType('PushSubscription')
class PushSubscription {
  subscriptionId: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
}
```

**Push Service (`lib/services/push.ts`):**

```typescript
import webPush from 'web-push';

webPush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

async function sendPushNotification(userId: string, payload: { title: string; message: string; actionUrl?: string }) {
  const subscriptions = await PushSubscriptionDAO.findByUserId(userId);

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload)),
    ),
  );

  // Remove invalid subscriptions (410 Gone)
  results.forEach((result, i) => {
    if (result.status === 'rejected' && result.reason.statusCode === 410) {
      PushSubscriptionDAO.delete(subscriptions[i].subscriptionId);
    }
  });
}
```

### Browser Compatibility

| Browser | Support                        |
| ------- | ------------------------------ |
| Chrome  | ✅ Full support                |
| Firefox | ✅ Full support                |
| Safari  | ✅ (macOS Ventura+, iOS 16.4+) |
| Edge    | ✅ Full support                |

---

## Email Notifications

### Technology Options

| Option       | Pros                           | Cons                                  |
| ------------ | ------------------------------ | ------------------------------------- |
| **AWS SES**  | Cheap, integrates with AWS     | Requires setup, reputation management |
| **SendGrid** | Easy API, good deliverability  | Cost scales with volume               |
| **Resend**   | Modern DX, React Email support | Newer service                         |

### Email Templates

Use React Email or MJML for responsive templates:

- Welcome email
- Event reminder
- Event cancellation
- Security alert
- Weekly digest

### Batching Strategy

To avoid spamming users, batch certain notifications:

| Notification Type | Strategy                                      |
| ----------------- | --------------------------------------------- |
| Event saves       | Batch hourly: "5 people saved your event"     |
| Follows           | Batch hourly: "3 new followers"               |
| Comments          | Batch per-event: "New comments on your event" |
| Reminders         | Send individually (time-sensitive)            |

---

## In-App Notifications

### GraphQL Schema

```graphql
type Query {
  notifications(limit: Int, cursor: String): NotificationConnection!
  unreadNotificationCount: Int!
}

type Mutation {
  markNotificationRead(notificationId: String!): Notification!
  markAllNotificationsRead: Boolean!
}

type Subscription {
  notificationReceived: Notification!
}
```

### UI Components

- **NotificationBell** - Header icon with unread count badge
- **NotificationDropdown** - List of recent notifications
- **NotificationItem** - Individual notification with avatar, message, timestamp
- **NotificationsPage** - Full page list with filters

---

## Implementation Roadmap

### Phase 1: Foundation

- [ ] Create Notification data model and DAO
- [ ] Implement NotificationService with create/read methods
- [ ] Add GraphQL queries for notifications
- [ ] Build NotificationBell and dropdown UI

### Phase 2: In-App Notifications

- [ ] Integrate notification creation into existing actions (follow, RSVP, etc.)
- [ ] Add mark as read functionality
- [ ] Implement notification batching logic
- [ ] Add real-time updates via GraphQL subscriptions

### Phase 3: Push Notifications

- [ ] Generate and store VAPID keys
- [ ] Implement service worker
- [ ] Create push subscription flow
- [ ] Add push toggle to settings
- [ ] Integrate push sending into NotificationService

### Phase 4: Email Notifications

- [ ] Set up email provider (SES/SendGrid)
- [ ] Create email templates
- [ ] Implement email sending in NotificationService
- [ ] Add email digest (weekly summary)

### Phase 5: Polish

- [ ] Notification preferences per type
- [ ] Do not disturb / quiet hours
- [ ] Notification sounds
- [ ] Clear all / bulk actions
