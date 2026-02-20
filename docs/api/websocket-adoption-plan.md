# WebSocket Adoption Plan

**Date:** 16 February 2026  
**Status:** 📋 Proposal  
**Owner:** API + Webapp teams

---

## Overview

This document proposes introducing WebSockets to support real-time product experiences across Gatherle.

The goal is to move from request/refresh/poll patterns to push-based updates where immediacy matters.

---

## Why This Matters

Today, many user-facing updates depend on polling, manual refresh, or mutation-triggered refetches. That creates:

- delayed updates for users
- extra network and compute load
- more complex frontend cache refresh logic
- inconsistent “freshness” between open tabs/devices

WebSockets give us a persistent channel to push state changes the moment they happen.

---

## Expected Benefits

### Product Benefits

- Faster feedback loops for notifications, chat, and social activity
- Better perceived performance and responsiveness
- More collaborative and “alive” user experience

### Engineering Benefits

- Reduced polling load and redundant GraphQL requests
- Simpler cache update strategy for real-time surfaces
- Stronger foundation for future interactive features (presence, typing, live counters)

### Platform Benefits

- Lower burst traffic from periodic polling
- Better control over event fan-out and observability
- Clear event contracts across backend and frontend

---

## Adoption Goals

- Introduce a stable, authenticated WebSocket channel for logged-in users
- Migrate high-value existing features first
- Define and standardize event envelopes and routing conventions
- Keep GraphQL as source of truth while WebSockets deliver incremental updates

### Non-Goals (Initial Phase)

- Replacing all GraphQL queries with sockets
- Building a full message queue platform before first delivery
- Supporting anonymous/public socket sessions in phase 1

---

## How We Will Start

We will begin with a phased approach:

### Phase 0: Design + Contract Alignment

- Define event envelope format (`type`, `payload`, `sentAt`, metadata)
- Define auth model for socket connection
- Define route/action naming conventions
- Define versioning and backward-compatibility rules

### Phase 1: Foundation

- Stand up WebSocket API endpoint
- Implement connection lifecycle handling (`connect`, `disconnect`, heartbeat)
- Persist active connection metadata for targeted delivery
- Add CloudWatch dashboards/alerts and failure visibility

### Phase 2: First Production Use Case

- Start with notification delivery and unread badge sync
- Validate reliability, reconnect behavior, and stale connection cleanup
- Measure latency and load improvements before wider rollout

### Phase 3: Progressive Migration

- Migrate selected existing features (below) in priority order
- Remove redundant polling/refetch logic per feature after stabilization

---

## Existing Features to Migrate to WebSockets

These already exist in product behavior and should be migrated to real-time delivery:

1. Notification unread badge and notification list updates
2. Chat unread badge updates
3. Follow request inbox updates (new request, accepted/rejected)
4. Chat conversation list and thread refresh updates
5. Event RSVP participant counters and attendee previews
6. “My upcoming RSVPs” updates on home/account surfaces
7. Organization member/role update visibility for affected users
8. Social feed incremental updates
9. Saved/unsaved event state synchronization across tabs/devices

---

## New Features to Implement via WebSockets

These are net-new websocket-native capabilities we should add after migration work begins:

1. Typing indicators in chat (`user is typing…`)
2. User presence (`online`, `last seen`)
3. Real-time delivery/read receipts with explicit event states
4. Live in-event counters (attendance/check-in changes without refresh)
5. Real-time organization/team announcements
6. Moderation/operator broadcast events for urgent user-facing notices

---

## Proposed Event Domains

Initial event domains to standardize:

- `notification.*`
- `chat.*`
- `follow.*`
- `event.*`
- `organization.*`
- `activity.*`
- `system.*` (heartbeat, reconnect hints, protocol notices)

---

## Rollout Strategy

- Ship behind feature flags per domain
- Start with one domain at a time (notifications first)
- Run dual-path temporarily (polling + socket) during validation
- Decommission polling only after parity checks pass

---

## Risks and Mitigations

### Risk: Socket lifecycle instability (disconnect/reconnect loops)

- Mitigation: exponential backoff + jitter, heartbeat, visibility-aware reconnect

### Risk: Event drift between backend and frontend contracts

- Mitigation: versioned event schema, shared type definitions, contract tests

### Risk: Duplicate/out-of-order updates

- Mitigation: idempotent cache updates, event timestamps/sequence strategy

### Risk: Stale connection fan-out failures

- Mitigation: stale connection cleanup on delivery failure, connection TTL strategy

---

## Success Metrics

We will consider phase success when:

- P95 “update visible to user” latency is significantly reduced
- Polling-driven unread queries are reduced materially
- Reconnect success rate remains high under normal churn
- No regression in correctness for unread counts and chat state
- Feature-level parity tests pass before polling removal

---

## Implementation Sequence (Recommended)

1. Notification unread + list live sync
2. Chat unread + conversation/thread synchronization
3. Follow request live inbox updates
4. RSVP/attendee live counters
5. Social feed incremental push
6. Presence + typing indicators

---

## Next Steps

1. Approve event envelope and domain naming conventions
2. Define phase-1 acceptance criteria and rollout flags
3. Build notification vertical slice end-to-end
4. Add observability dashboard for socket health and delivery outcomes
5. Schedule migration workstream by domain owner

---

## Living Update: 17 February 2026 (Implementation Snapshot)

**Status:** ✅ WebSocket foundation is live in API + webapp, with notifications/chat/follow/RSVP realtime paths active.

This section documents what is implemented today so this plan can evolve as a living reference.

### What Is Live Right Now

- AWS API Gateway WebSocket API + Lambda integration is deployed via CDK.
- Route selection uses `$request.body.action`.
- Core routes are live: `$connect`, `$disconnect`, `$default`, `ping`, `notification.subscribe`, `chat.send`,
  `chat.read`.
- Connection records are persisted in MongoDB with TTL cleanup.
- Realtime publisher is wired into:
  - notification creation (`notification.new`)
  - follow request create/update (`follow.request.created`, `follow.request.updated`)
  - event RSVP updates (`event.rsvp.updated`)
  - chat send/read flows (`chat.message`, `chat.read`, `chat.conversation.updated`)
- Webapp now uses one shared WebSocket connection per browser tab, with multiple subscribers (chat, notifications, and
  feature-specific subscribers like share dialog send).

### Deployed Backend Architecture (API Gateway + Lambda)

#### 1. Infrastructure

- Stack: `infra/lib/stack/websocket-stack.ts`
- API name: `GatherleWebSocketApi`
- Stage: lowercase `STAGE` (for example `beta`)
- Lambda: `WebSocketLambdaFunction` (Node.js 24, 30s timeout, 256MB)
- Route selection expression: `$request.body.action`
- API Gateway management permissions granted to Lambda via `grantManageConnections`.

#### 2. Lambda routing

- Entry point: `apps/api/lib/websocket/lambdaHandler.ts`
- Route handler dispatch:
  - `$connect` -> `handleConnect`
  - `$disconnect` -> `handleDisconnect`
  - `notification.subscribe` -> `handleNotificationSubscribe`
  - `chat.send` -> `handleChatSend`
  - `chat.read` -> `handleChatRead`
  - `ping` -> `handlePing`
  - fallback -> `handleDefault`

#### 3. Connection persistence model

- DAO: `apps/api/lib/mongodb/dao/websocketConnection.ts`
- Model: `apps/api/lib/mongodb/models/websocketConnection.ts`
- Fields:
  - `connectionId`, `userId`, `domainName`, `stage`
  - `connectedAt`, `lastSeenAt`, `expiresAt`
- Indexes:
  - unique `connectionId`
  - lookup by `userId`
  - TTL index on `expiresAt` (`expireAfterSeconds: 0`)

#### 4. Auth + lifecycle

- Token extraction: `apps/api/lib/websocket/event.ts`
  - primary: query param `token`
  - fallback: `Authorization: Bearer <token>`
- Connect flow: `apps/api/lib/websocket/routes/connect.ts`
  - verifies JWT
  - rejects missing/invalid token with `401`
  - stores connection record
- Touch flow (for activity + TTL refresh): `apps/api/lib/websocket/routes/touch.ts`
  - called on message routes
- Disconnect flow: `apps/api/lib/websocket/routes/disconnect.ts`
  - removes connection record

#### 5. Message delivery

- Gateway management client wrapper: `apps/api/lib/websocket/gateway.ts`
- Event envelope shape:

```json
{
  "type": "event.name",
  "payload": {},
  "sentAt": "2026-02-17T00:00:00.000Z"
}
```

- Publisher: `apps/api/lib/websocket/publisher.ts`
  - reads all active connections for target users
  - posts payload to each connection
  - removes stale connections on `GoneException` / HTTP 410

### Current Event Contracts

#### Client actions (to server)

- `ping`
- `notification.subscribe`
- `chat.send`
- `chat.read`

#### Server events (to client)

- `ping.pong`
- `notification.new`
- `follow.request.created`
- `follow.request.updated`
- `event.rsvp.updated`
- `chat.message`
- `chat.read`
- `chat.conversation.updated`

### Where Events Are Published From

- Notifications:
  - `apps/api/lib/services/notification.ts` -> `publishNotificationCreated` / `publishNotificationsCreated`
- Follow:
  - `apps/api/lib/services/follow.ts` -> `publishFollowRequestCreated` / `publishFollowRequestUpdated`
- Event RSVP:
  - `apps/api/lib/services/eventParticipant.ts` -> `publishEventRsvpUpdated`
- Chat:
  - `apps/api/lib/services/chatMessaging.ts`
  - send path publishes `chat.message` + `chat.conversation.updated`
  - read path publishes `chat.read` + `chat.conversation.updated`

### Local Development Architecture

- Local WebSocket server: `apps/api/lib/websocket/localServer.ts`
- Bootstrapped from API start script: `apps/api/lib/scripts/startServer.ts`
- Local server emulates API Gateway events and invokes the same websocket Lambda handler.
- Local domain marker: `local.websocket.internal` (`apps/api/lib/websocket/localGateway.ts`)
- Example local URL pattern: `ws://localhost:<api-port>/<stage>?token=<jwt>`

### Webapp Connection Architecture (Detailed)

#### 1. Connection mount points

- Root layout mounts both listeners:
  - `apps/webapp/components/notifications/NotificationRealtimeListener.tsx`
  - `apps/webapp/components/messages/ChatRealtimeListener.tsx`
- Mounted in `apps/webapp/layouts/root-layout/index.tsx`.

#### 2. Shared connection manager

- Core manager: `apps/webapp/lib/utils/realtime/sharedRealtimeConnectionManager.ts`
- Socket lifecycle module: `apps/webapp/lib/utils/realtime/connectionSocket.ts`
- Subscriber registry: `apps/webapp/lib/utils/realtime/subscriberStore.ts`
- Types/contracts: `apps/webapp/lib/utils/realtime/types.ts`

Key behavior:

- One shared WebSocket connection per tab.
- Features register as subscribers with callbacks (`onMessage`, `onOpen`, `onClose`, `onError`).
- Connection opens only when prerequisites exist:
  - websocket URL
  - logged-in userId
  - token
  - at least one enabled subscriber
- Connection identity changes (user or URL) trigger controlled close + reconnect.
- Ping interval: 30 seconds.
- Reconnect uses exponential backoff + jitter.

#### 3. Webapp hooks

- Notifications hook: `apps/webapp/hooks/useNotificationRealtime/useNotificationRealtime.ts`
  - subscribes to notification/follow/rsvp event types
  - updates Apollo cache through `notificationRealtimeCache.ts`
  - sends `notification.subscribe` on open (and on already-open attach)
- Chat hook: `apps/webapp/hooks/useChatRealtime/useChatRealtime.ts`
  - consumes chat event types
  - exposes `sendChatMessage` and `markConversationRead` actions
- Chat listener orchestration hook:
  - `apps/webapp/hooks/useChatRealtime/useChatRealtimeListener.ts`
  - debounces and triggers conversation/message refetches
  - updates unread count cache

#### 4. Client connection configuration

- WebSocket base URL comes from `NEXT_PUBLIC_WEBSOCKET_URL`.
- Normalization utility maps `http/https` -> `ws/wss`:
  - `apps/webapp/lib/utils/websocket.ts`
- Token is currently attached as query parameter (`token`) by the client URL builder.

### Operational Notes and Known Gaps

- `notification.subscribe` is currently acknowledged but topic state is not yet persisted server-side.
- We currently use query-string token auth for connect; this is functional but not ideal for long-term hardening.
- Event ordering/dedupe is primarily handled at consumer/cache logic level; no global sequence number yet.
- `$default` route includes fallback action dispatch for robustness.

### Future Improvements (Next Iterations)

#### Security and protocol hardening

- Add short-lived websocket connection tickets (minted via GraphQL/REST) to avoid passing long-lived JWTs in URL.
- Add protocol version field in envelope (`v`) for safer contract evolution.
- Add optional event IDs and replay-safe idempotency hints.

#### Delivery and correctness

- Add optional delivery acknowledgements for high-value event classes.
- Add client-side dedupe support using event IDs.
- Add stronger out-of-order handling for conversation updates.

#### Subscription model

- Move from simple acknowledge-only `notification.subscribe` to persisted server-side topic/interest state.
- Enable selective fan-out by topic/domain to reduce unnecessary payload dispatch.

#### Product features

- Typing indicators (`chat.typing.started`, `chat.typing.stopped`)
- Presence (`user.presence.updated`)
- Explicit message delivery/read receipts UX states
- More realtime social surfaces (feed/card deltas, org activity streams)

#### Observability

- Add websocket-specific CloudWatch metrics:
  - active connections
  - reconnect rate
  - stale connection cleanup rate
  - event publish success/failure rates per event type
- Add dashboard and alarms for route-level error rates and publish latency.

### Suggested Update Cadence For This Living Doc

- Update this document after every websocket milestone PR merge.
- Keep a short dated entry in this section (like this one) with:
  - what shipped
  - event contracts added/changed
  - known gaps introduced/closed
  - next milestone focus
