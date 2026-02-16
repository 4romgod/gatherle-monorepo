# WebSocket Adoption Plan

**Date:** 16 February 2026  
**Status:** 📋 Proposal  
**Owner:** API + Webapp teams

---

## Overview

This document proposes introducing WebSockets to support real-time product experiences across Ntlango.

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
