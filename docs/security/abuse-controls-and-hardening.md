# Gatherle Abuse Controls And Hardening

Created: 2026-05-16

This document consolidates the two shipped hardening phases for Gatherle's public surfaces:

- edge protection on the GraphQL API
- runtime GraphQL and WebSocket abuse controls
- login, user-enumeration, and CI/CD identity hardening

Use this as the implementation-oriented hardening guide. Keep the broader risk picture in
[threat-model-risk-register.md](./threat-model-risk-register.md), and keep provider/auth architecture guidance in
[auth-architecture-and-provider-roadmap.md](./auth-architecture-and-provider-roadmap.md).

---

## Scope

This guide covers protections in:

- `apps/api`
- `apps/webapp`
- `infrastructure/cdk`
- GitHub Actions deploy auth

The main goal is practical cost, abuse, and blast-radius reduction for public API and realtime surfaces.

---

## Current Hardening Model

Think about the current posture in layers:

1. **Edge controls** stop obvious request floods before the app runs.
2. **Runtime guards** reject expensive or invalid requests before resolvers do real work.
3. **Route and identity controls** reduce abuse in login, public user discovery, WebSocket actions, and CI/CD.
4. **Monitoring** makes regressions visible before they become outages or runaway cost.

---

## Phase 1: Edge Protection

Phase 1 focused on the public GraphQL edge.

### What shipped

1. API Gateway stage throttling
2. AWS WAF rate-based blocking on the GraphQL REST API stage

These controls are meant to reduce:

- accidental traffic spikes
- naive scripted flooding
- avoidable Lambda and MongoDB cost amplification
- unauthenticated pressure on the public beta API

### Current GraphQL defaults

| Stage | API Gateway rate limit | API Gateway burst limit | WAF rate limit per IP / 5 min |
| ----- | ---------------------- | ----------------------- | ----------------------------- |
| Dev   | 50 req/s               | 100                     | 2,000                         |
| Beta  | 25 req/s               | 50                      | 1,000                         |
| Gamma | 100 req/s              | 200                     | 3,000                         |
| Prod  | 250 req/s              | 500                     | 10,000                        |

### Environment overrides

- `GRAPHQL_API_THROTTLE_RATE_LIMIT`
- `GRAPHQL_API_THROTTLE_BURST_LIMIT`
- `GRAPHQL_API_WAF_RATE_LIMIT`

### What stage throttling means

`throttlingRateLimit`

- the steady-state request rate
- requests above that rate eventually receive `429`

`throttlingBurstLimit`

- the token-bucket capacity
- allows short spikes above the steady-state rate

Important constraints:

- throttling is stage-wide, not user-aware
- it is best-effort, not a perfect hard ceiling
- it understands request count, not GraphQL query cost

### Why WAF still matters

The current WAF rule is simple but useful:

- aggregates by source IP
- uses a 300-second window
- blocks a caller once it crosses the per-IP request limit

It does not solve:

- distributed multi-IP abuse
- GraphQL query-cost abuse
- WebSocket abuse

It does help because it rejects obvious bad traffic before:

- Lambda concurrency is consumed
- MongoDB sees the load
- auth and logging paths get noisy

### Current cost envelope

At the time this phase was documented, the basic WAF setup was roughly:

- `$5` web ACL
- `$1` custom rule
- `$0.60` per 1M requests inspected

Directional examples:

| Requests inspected by WAF / month | Approximate cost |
| --------------------------------- | ---------------- |
| 1 million                         | `$6.60`          |
| 10 million                        | `$12.00`         |
| 100 million                       | `$66.00`         |

This does not include future add-ons like managed rules, CAPTCHA, or dedicated WAF logging.

### Why this phase came first

For beta, edge controls were the fastest high-value protection because they are:

- infra-only
- low-maintenance
- effective against simple floods
- easy to tune by stage

They are necessary, but not sufficient.

---

## Phase 2: Runtime And Identity Hardening

Phase 2 added protections behind the edge so a small number of expensive requests could not still hurt the platform.

### 1. GraphQL query guards

Implemented in:

- `apps/api/lib/graphql/security/queryGuards.ts`
- `apps/api/lib/graphql/apollo/server.ts`
- `apps/api/lib/utils/graphqlQueryGuardMetrics.ts`
- dashboard constructs in `infrastructure/cdk`

Every GraphQL request is checked before resolver execution for:

1. maximum depth
2. maximum computed complexity
3. introspection permission for the stage

#### Current defaults

| Stage | Max depth | Max complexity | Introspection default |
| ----- | --------- | -------------- | --------------------- |
| Dev   | 14        | 1200           | Enabled               |
| Beta  | 10        | 700            | Enabled               |
| Gamma | 10        | 800            | Enabled               |
| Prod  | 8         | 650            | Disabled              |

#### Environment overrides

- `GRAPHQL_QUERY_MAX_DEPTH`
- `GRAPHQL_QUERY_MAX_COMPLEXITY`
- `GRAPHQL_ALLOW_INTROSPECTION`

#### What the guards actually do

- reject deeply nested traversal-heavy queries
- reject overly broad list queries before resolver work starts
- block schema discovery in production by default
- emit metrics for accepted and rejected operations

Metrics now include:

- `QueryComplexity`
- `QueryDepth`
- `QueryGuardAccepted`
- `QueryGuardRejected`

#### Important limitation

This is still heuristic protection, not a perfect cost model.

The guards do **not** understand:

- resolver-specific internal cost
- caching differences
- cumulative cost across many small queries

They are still an important line of defense because they stop obviously expensive requests early.

### 2. WebSocket throttling and validation

Implemented in:

- `infrastructure/cdk/lib/constants/websocket-security.ts`
- `infrastructure/cdk/lib/stack/websocket-stack.ts`
- `apps/api/lib/validation/zod/websocket.ts`
- `apps/api/lib/websocket/routes/*`
- `apps/api/lib/websocket/lambdaHandler.ts`

What changed:

- stage throttling is enabled for the WebSocket API
- route-level throttles exist for `ping`, `notification.subscribe`, `chat.send`, and `chat.read`
- payloads are schema-validated before route logic runs
- unsupported actions now return `400`
- application errors map to client-facing websocket responses instead of generic failures

Supported overrides:

- `WEBSOCKET_STAGE_THROTTLE_RATE_LIMIT`
- `WEBSOCKET_STAGE_THROTTLE_BURST_LIMIT`

Important limitation:

- API Gateway WebSocket does not get the same WAF attachment path as API Gateway REST
- current protection is burst shaping plus app-level quotas, not full distributed-abuse filtering

### 3. Login and user-enumeration hardening

Implemented in:

- `apps/api/lib/mongodb/models/authAttempt.ts`
- `apps/api/lib/mongodb/dao/authAttempt.ts`
- `apps/api/lib/utils/requestMetadata.ts`
- `apps/api/lib/graphql/resolvers/user.ts`
- `apps/webapp/components/users/UsersPageClient.tsx`

What changed:

- repeated login failures are tracked by email and source IP
- temporary lockouts apply after repeated failures
- `readUsers` now requires authentication
- `readUserByEmail` is restricted to admins, hosts, or the matching user
- public `readUserById` and `readUserByUsername` still work, but sensitive fields are redacted
- the webapp community directory now requires sign-in

Current lockout defaults:

- failure window: 15 minutes
- lockout duration: 15 minutes
- threshold: 8 failed attempts

This is a baseline credential-stuffing control. It does not replace CAPTCHA or adaptive risk scoring.

### 4. GitHub OIDC hardening

Implemented in:

- `infrastructure/cdk/lib/stack/github-auth-stack.ts`
- `infrastructure/cdk/lib/github-auth-app.ts`

What changed:

- trust no longer accepts a broad repo-wide OIDC subject
- trust is restricted to exact protected deployment environments
- `AdministratorAccess` was removed
- roles are split by environment concern:
  - Beta runtime deploy
  - Prod runtime deploy
  - DNS deploy
- `iam:*` was replaced with explicit IAM actions
- SSM and Secrets Manager access is now scoped to Gatherle prefixes

Current trusted subjects:

- `environment:Beta-af-south-1`
- `environment:Prod-af-south-1`
- `environment:dns-af-south-1`

This is materially better than the original posture, but still not the end state.

---

## Monitoring

Hardening is only useful if it is visible.

Current monitoring covers:

- GraphQL and WebSocket traffic spikes
- API `4XX` and `5XX`
- throttles
- Lambda errors
- login abuse spikes
- query guard depth and complexity metrics

The current repo still needs dedicated alarms for:

- WAF block-rate spikes
- websocket send-failure anomalies
- budget anomalies across API Gateway, Lambda, WAF, and CloudWatch logs

---

## Verification Snapshot

The original implementation notes included successful checks across API, webapp, and CDK validation, including:

- API TypeScript build
- focused unit tests for GraphQL query guards
- focused websocket quota and route tests
- webapp typecheck
- CDK builds and synths for runtime, monitoring, GitHub auth, and secrets stacks

Known caveat at the time of the hardening pass:

- `npm run typecheck -w @gatherle/api` still reported unrelated pre-existing test typing failures outside the hardening
  change set

---

## Residual Risks

The largest remaining gaps are:

1. **WebSocket distributed-abuse handling**
   - no WAF-equivalent front-door control
   - still uses bearer-style connect auth instead of short-lived connect tickets

2. **Public profile contract design**
   - public and private reads still share the main `User` type
   - redaction is still resolver-driven rather than schema-explicit

3. **CI/CD least privilege**
   - deploy roles are narrower, but still broader than ideal
   - no dedicated secrets/bootstrap role yet

4. **Auth abuse detection**
   - lockouts exist, but there is no CAPTCHA, adaptive challenge, or user-facing unlock flow

5. **Edge monitoring and spend protection**
   - budget alarms and WAF block-rate alarms are still missing

---

## Recommended Next Phase

1. Add WAF block-rate alarms and budget alerts.
2. Replace long-lived websocket bearer auth with short-lived connect tickets.
3. Introduce a dedicated secrets/bootstrap deploy role and keep narrowing runtime-role resource scope.
4. Design a dedicated public-profile GraphQL contract instead of relying on field redaction alone.
5. Add stronger distributed-abuse controls for realtime surfaces.

---

## Related Docs

- [Threat Model & Risk Register](./threat-model-risk-register.md)
- [Authentication And Authorization Architecture](./auth-architecture-and-provider-roadmap.md)
- [API Observability Guide](../api/observability.md)
