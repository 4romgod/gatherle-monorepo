# Gatherle API Edge Protection and Throttling

Created: 2026-05-11

## Purpose

This document explains the first phase of Gatherle's public API abuse protection work.

It covers:

- what was implemented in the GraphQL API stack
- how API Gateway throttling works
- how the AWS WAF web ACL works
- what these controls do and do not protect against
- expected cost characteristics
- the next phase of GraphQL, WebSocket, and frontend hardening

This document is repo-specific. It reflects the implementation in:

- `infrastructure/cdk/lib/stack/graphql-stack.ts`
- `infrastructure/cdk/lib/constants/graphql-api-security.ts`
- `infrastructure/cdk/lib/utils/config.ts`
- `infrastructure/cdk/lib/stack/websocket-stack.ts`
- `apps/webapp/next.config.mjs`

---

## What We Shipped In This Phase

We added two edge-layer controls to the public GraphQL API stage:

1. API Gateway stage throttling
2. AWS WAF rate-based blocking on the GraphQL REST API stage

These controls are intended to reduce:

- accidental traffic spikes
- simple scripted flooding from a small number of IPs
- avoidable Lambda and MongoDB cost amplification
- public unauthenticated abuse pressure on the beta API

### Current GraphQL Defaults

These defaults are currently defined in `infrastructure/cdk/lib/constants/graphql-api-security.ts`.

| Stage | API Gateway rate limit | API Gateway burst limit | WAF rate-based limit                 |
| ----- | ---------------------- | ----------------------- | ------------------------------------ |
| Dev   | 50 req/s               | 100                     | 2,000 requests per 5 minutes per IP  |
| Beta  | 25 req/s               | 50                      | 1,000 requests per 5 minutes per IP  |
| Gamma | 100 req/s              | 200                     | 3,000 requests per 5 minutes per IP  |
| Prod  | 250 req/s              | 500                     | 10,000 requests per 5 minutes per IP |

### Environment Overrides

The GraphQL stack now supports these environment variables:

- `GRAPHQL_API_THROTTLE_RATE_LIMIT`
- `GRAPHQL_API_THROTTLE_BURST_LIMIT`
- `GRAPHQL_API_WAF_RATE_LIMIT`

These are parsed in `infrastructure/cdk/lib/utils/config.ts`.

---

## API Gateway Throttling

### What `throttlingRateLimit` Means

`throttlingRateLimit` is the steady-state request rate target for the stage.

Conceptually:

- API Gateway uses a token bucket algorithm
- tokens are added to the bucket at the configured rate
- each request consumes one token
- when requests arrive faster than tokens are replenished, API Gateway starts returning `429 Too Many Requests`

In our beta stage, the steady-state target is currently `25 req/s`.

### What `throttlingBurstLimit` Means

`throttlingBurstLimit` is the bucket capacity.

Conceptually:

- it allows short traffic spikes above the steady-state rate
- once the burst bucket is drained, API Gateway falls back to the steady-state rate

In our beta stage, the burst capacity is currently `50`.

That means a short spike can be absorbed, but sustained request floods will start getting throttled quickly.

### Do These Settings Need API Keys?

No.

The stage-level throttles we added work out of the box and do **not** require API keys or usage plans.

That distinction matters:

- **Stage-level throttling** applies to all requests that hit the API stage
- **Usage plan throttling** applies per API key and is for identifying and shaping individual clients

For Gatherle's current public GraphQL endpoint, stage-level throttling is the correct first move because it works even
for anonymous traffic and unsolicited abuse.

### Where API Keys Fit

API keys and usage plans are useful when:

- you have identifiable clients
- you want client-specific quotas
- you want different limits for different integrations or tenants

They are **not** a replacement for security controls on a public consumer API.

AWS explicitly warns not to rely on usage plans alone to control costs or block access. They are best-effort and not a
hard security boundary.

### Important Limits Of API Gateway Throttling

API Gateway throttling is useful, but it is not sufficient on its own:

- it is best-effort, not a guaranteed hard ceiling
- all callers on the stage share the same throttle bucket
- one abusive caller can still consume the shared stage capacity until WAF or auth logic filters them
- it does not understand GraphQL cost differences between a cheap query and an expensive query

### Gatherle-Specific Quota Context

Gatherle beta runs in `af-south-1` today.

According to current AWS API Gateway quotas, the default account-level quota in Africa (Cape Town) is lower than the
general default:

- `2,500 RPS` default account-level throttle quota
- `1,250` default burst quota

Our beta stage limits (`25 req/s`, burst `50`) are intentionally far below that account-level ceiling.

That is deliberate. For beta, we want conservative limits that reduce cost exposure before we optimize for throughput.

---

## AWS WAF Web ACL

### What A Web ACL Is

A web ACL is a set of request-filtering rules attached to a protected resource.

In our case:

- the protected resource is the API Gateway **REST API stage** for GraphQL
- the web ACL is regional
- the ACL contains a rate-based blocking rule

### How It Is Evaluated

For API Gateway REST APIs, AWS documents that WAF is evaluated before:

- resource policies
- IAM policies
- Lambda authorizers
- Cognito authorizers

That is exactly what we want for abuse protection, because we prefer to reject obvious bad traffic before it reaches the
rest of the API stack.

### What Our Current Rule Does

The current rule:

- aggregates by source IP
- uses a `300` second evaluation window
- blocks requests when a single IP exceeds the configured limit

For beta, that limit is currently:

- `1,000 requests per 5 minutes per IP`

This is a useful first-line filter for:

- simple curl loops
- naive bots
- obvious request flooding from a small set of IPs

### What It Does Not Solve

This rule does **not** fully solve DDoS or API abuse:

- a distributed attack across many IPs can still get traffic through
- a shared NAT or mobile carrier IP can create false positives if too many legitimate users share one IP
- the rule only counts requests, not request complexity
- it protects the GraphQL REST edge, not the WebSocket API

### Why WAF Still Helps

Even with those limitations, WAF is still valuable because it can stop bad traffic early, before it becomes:

- Lambda concurrency pressure
- MongoDB query load
- resolver-level CPU and memory cost
- auth/logging noise

That is the main reason to keep WAF in front of the public GraphQL API even though it is not a complete answer.

---

## Cost Characteristics

### API Gateway Throttling Cost

API Gateway stage throttling is a stage configuration, not a separately priced add-on.

API Gateway pricing is still based on:

- API calls received
- data transferred out

Inference:

- stage throttling reduces downstream Lambda and MongoDB cost exposure quickly
- it should not be treated as a zero-cost shield, because throttled requests still hit the API edge

### WAF Cost Model

As of 2026-05-11, the AWS WAF pricing page lists charges based on:

- number of web ACLs
- number of rules
- number of web requests processed

The current published list pricing shown on the AWS WAF pricing page is:

- `$5.00` per web ACL per month
- `$1.00` per rule per month
- `$0.60` per 1 million requests

AWS notes that pricing can vary by Region.

### What That Means For Our Current Setup

Our current GraphQL protection is a small WAF configuration:

- `1` web ACL
- `1` custom rate-based rule
- no managed rule groups
- no CAPTCHA
- no Bot Control
- no extra WCU overage

Important detail:

- a basic rate-based rule uses `2 WCUs`
- AWS includes `1500 WCUs` before extra WCU request charges apply

So this specific rule stays well inside the included WCU allocation.

### Rough Cost Envelope For The Current WAF Setup

Using the current public list prices from the AWS WAF pricing page, and ignoring Region-specific variation:

| Requests inspected by WAF per month | Approximate WAF cost |
| ----------------------------------- | -------------------- |
| 1 million                           | about `$6.60`        |
| 10 million                          | about `$12.00`       |
| 100 million                         | about `$66.00`       |

This is roughly:

- `$5` web ACL
- `$1` rule
- plus request volume charges

### Additional Cost Caveats

Costs can increase later if we add:

- managed rule groups
- CAPTCHA or Challenge actions
- WAF logging to CloudWatch, S3, or Firehose
- more custom rules

Current implementation note:

- this phase does **not** enable dedicated WAF request logging
- it does enable WAF metrics and sampled requests visibility through the web ACL

---

## Why This Was The Right First Phase

For Gatherle beta, the highest-risk problem was straightforward:

- the beta API URL is public
- unauthenticated traffic can hit it
- the backend is serverless and request-driven
- without edge controls, a flood can scale cost and backend load quickly

Stage throttling plus a WAF rate rule is the right first phase because it is:

- fast to ship
- infra-only
- effective against simple abuse
- easy to tune per stage
- low ongoing operational complexity

It is not the end state.

---

## Next Phase Hardening Plan

The next phase should move from **edge-only protection** to **edge + application-layer abuse control**.

### 1. GraphQL Application-Layer Throttling And Abuse Controls

These should be the next GraphQL controls:

1. Add GraphQL query depth limits
2. Add GraphQL complexity or cost scoring
3. Add stricter max request body size controls where appropriate
4. Add conservative pagination caps on all public or expensive list operations
5. Disable or tightly restrict production landing page and introspection behavior where appropriate
6. Add extra throttling or auth requirements for sensitive public endpoints such as user discovery and login flows

Why this matters:

- WAF only sees requests
- GraphQL cost controls understand query shape
- that closes the gap where one request can still be disproportionately expensive

### 2. Method-Specific GraphQL Limits

The current stage throttle is shared across the whole API.

The next phase should introduce narrower controls for high-cost or abuse-prone operations, for example:

- login and password reset flows
- search/discovery endpoints
- public user lookup paths
- media-related mutations

This can be done through:

- method-level API Gateway throttles
- resolver-level rate limits
- stricter auth requirements

### 3. WebSocket Protection

Yes, the WebSocket API also needs protection.

It is a different threat shape:

- long-lived connections
- repeated message sends after connect
- fan-out pressure on notifications and chat
- persistent connection cost rather than only per-request Lambda cost

### What AWS Gives Us Today

API Gateway WebSocket APIs support:

- account-level throttling
- stage throttling
- message size enforcement

API Gateway documents WebSocket-specific close behavior for:

- too many requests from a client
- messages that are too large

### What Is Important For Gatherle

Current repo state:

- `infrastructure/cdk/lib/stack/websocket-stack.ts` configures stage throttles
- there is no current websocket WAF association in the stack

Important design constraint:

- AWS WAF's documented API Gateway association is for **REST APIs**
- the supported resource list in AWS WAF documentation does not list API Gateway WebSocket APIs

That means our WebSocket protection path should be:

1. keep conservative stage throttling in the WebSocket stage
2. add message schema validation on every action
3. add payload size checks and conservative per-action limits
4. add per-user or per-connection abuse controls for chat and notification subscription paths
5. shorten auth lifetime for websocket connect flows over time

### Recommended WebSocket Next Steps

1. Keep conservative stage throttling on the WebSocket stage
2. Enforce payload schema validation for every route
3. Add app-level anti-spam limits for chat sends and read receipts
4. Add alarms for connection spikes, throttles, and backend send failures
5. Consider connection-level or identity-level quotas where stage throttling is too coarse

### 4. Frontend Protection

Yes, the frontend also needs protection, but the risk profile is different.

### What Is Already Good

The webapp already has some useful browser-side hardening in `apps/webapp/next.config.mjs`:

- CSP
- `X-Frame-Options`
- `Referrer-Policy`
- production HSTS

Those controls help with browser security, not traffic abuse protection.

### What Frontend Abuse Protection Means

For the frontend, we care about:

- static asset and page delivery cost
- SSR or server action cost if the webapp is deployed dynamically
- auth callback abuse
- bot scraping and sign-in brute force

### Recommended Frontend Direction

If the frontend is publicly deployed, the next phase should ensure:

1. the frontend sits behind a CDN or edge platform with abuse protection
2. SSR or dynamic routes are protected by edge rate limiting where possible
3. auth routes get dedicated brute-force protection
4. static assets are aggressively cached
5. API and websocket origins remain narrowly whitelisted in CSP and env configuration

For a static-heavy frontend, the blast radius is usually lower than the API because cached assets are cheaper to serve.
For SSR or server actions, the protection needs look much closer to API protection.

### 5. Detection And Operations

Protection is incomplete without visibility.

Next phase monitoring should include:

1. CloudWatch alarms on API Gateway `4XXError`, `5XXError`, and throttle spikes
2. alarms on WAF blocked-request spikes
3. Lambda concurrency and error alarms for GraphQL and WebSocket handlers
4. AWS Budgets alerts for API Gateway, Lambda, WAF, and CloudWatch logs
5. dashboards for blocked, throttled, and allowed request patterns by stage

---

## Recommended Position For Beta

For beta, the system should remain conservative.

Recommended operating stance:

- keep the current beta stage throttles low until real traffic baselines are known
- keep the WAF rate rule enabled
- add CloudWatch and budget alarms before broad beta exposure
- add GraphQL query-cost controls in the next phase before raising limits materially
- add websocket app-level quotas before scaling realtime adoption

---

## Summary

The current phase gives Gatherle a real first line of defense for the public GraphQL API:

- API Gateway stage throttling reduces uncontrolled throughput
- AWS WAF rate-based blocking filters obvious abusive IPs before deeper API evaluation

This is a meaningful improvement, but not the final protection model.

The next phase should focus on:

- GraphQL query-cost controls
- websocket app-level message limits and connection-level quotas
- frontend edge protection for dynamic routes and auth flows
- monitoring and budget alarms

That combination is the practical path from "basic public edge protection" to "defensible public API posture."

---

## References

Official AWS references used for this document:

- API Gateway REST throttling:
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- API Gateway usage plans and API keys:
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- API Gateway quotas:
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
- Protect REST APIs with AWS WAF:
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html
- AWS WAF supported resource types:
  - https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html
- AWS WAF rate-based rules:
  - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
- AWS WAF pricing:
  - https://aws.amazon.com/waf/pricing/
- Protect WebSocket APIs:
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-protect.html
- API Gateway pricing:
  - https://aws.amazon.com/api-gateway/pricing/
