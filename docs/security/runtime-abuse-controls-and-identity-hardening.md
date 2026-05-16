# Gatherle Runtime Abuse Controls and Identity Hardening

Created: 2026-05-16

## Purpose

This document captures the second hardening phase after the initial GraphQL edge throttling and WAF work.

It focuses on:

- GraphQL runtime abuse controls
- WebSocket abuse controls
- user-enumeration and login hardening
- GitHub OIDC deploy-role tightening

The goal is to reduce AWS cost-spike risk, tighten public data exposure, and shrink the CI/CD blast radius.

## What Shipped

### 1. GraphQL Abuse Controls: Query Guards, Depth Limits, and Complexity Scoring

Implemented in:

- [apps/api/lib/graphql/security/queryGuards.ts](../../apps/api/lib/graphql/security/queryGuards.ts)
- [apps/api/lib/graphql/apollo/server.ts](../../apps/api/lib/graphql/apollo/server.ts)

#### The Problem We're Solving

Before this feature, the API had two layers of protection against bad actors:

1. **WAF (Web Application Firewall)** and **API Gateway throttling** — these limit _how many requests_ can hit the
   server in a given time window.
2. **Rate limiting** — this prevents single clients from flooding the API with thousands of requests per second.

However, there was a critical gap: **an attacker doesn't need high request volume to hurt you**. A single malicious user
could craft a few extremely expensive GraphQL queries that:

- Require the database to scan millions of documents
- Cause Lambda functions to timeout (burning compute cost)
- Trigger cascading resolver calls that fan out exponentially
- Lock up the database with expensive aggregation pipelines

Without query guards, a small handful of carefully crafted requests could cause the same damage as a DDoS attack with
thousands of requests.

**Query guards close this gap** by rejecting expensive queries _before_ they reach your resolvers. The check happens
early in the request pipeline—after GraphQL parses the query but before any database work begins.

#### How Query Guards Work: The Three Checks

Every incoming GraphQL query is checked against three rules:

1. **Depth limit** — the maximum nesting depth allowed in a single query
2. **Complexity score** — a cost calculation based on how "expensive" a query is
3. **Introspection blocking** — prevent schema exploration in production

All three checks run in the Apollo middleware before resolver execution. If any check fails, the query is rejected with
a `400 Bad Request` error and never touches the database.

---

#### Understanding Depth Limits

**What is depth?** Depth is how many levels deep you nest relationships in a single GraphQL query.

Think of it like Russian nesting dolls: each layer you open is one level deeper.

**Simple example:**

```graphql
query {
  readUserById(userId: "user-123") {
    username
    email
  }
}
```

This query has a depth of **2**:

- Level 1: `readUserById` — the root query field
- Level 2: `username` and `email` — fields on the user

**A deeper example:**

```graphql
query {
  readUsers {
    location {
      coordinates {
        latitude
      }
    }
  }
}
```

This query has a depth of **4**:

- Level 1: `readUsers`
- Level 2: `location`
- Level 3: `coordinates`
- Level 4: `latitude`

**Why do we care?**

The deeper the nesting, the more relationship traversals your database and resolvers have to perform. A pathological
query like the one above could:

- Walk through dozens of object relationships in a single call
- Require N+1 database lookups on each level
- Force resolvers to hydrate complex nested structures

A depth limit says: "You can nest at most **8** relationships deep in Prod. No deeper." This prevents attackers from
crafting queries that traverse your entire object graph in one go.

**Default depth limits by stage:**

| Stage | Max Depth | Why?                                                                      |
| ----- | --------- | ------------------------------------------------------------------------- |
| Dev   | 14        | Developers need flexibility to test deep relationships during development |
| Beta  | 10        | Closer to production, but still permissive for testing new features       |
| Gamma | 10        | Pre-production environment, maintain feature parity with Beta             |
| Prod  | 8         | Tight controls for live user-facing traffic                               |

**How depth is measured:**

The guard counts the maximum nesting level across all fields in the query. Fragments (reusable query pieces) and inline
fragments also count toward depth, so you can't bypass the limit by restructuring your query.

---

#### Understanding Complexity Scoring

**What is complexity?** Complexity is a cost score that estimates how expensive a query is to execute. It's not just
about depth—it also factors in:

- How many fields are being requested
- Whether fields retrieve lists of items
- How large those lists can be (based on pagination arguments)

Think of complexity like an energy meter: each field costs energy, and list fields cost more energy than scalar fields.

**Simple example:**

```graphql
query {
  readUserById(userId: "user-123") {
    userId
    username
    email
    bio
  }
}
```

This query requests 4 scalar fields on a single user. The complexity might be around **4** (one point per field).

**A more expensive example:**

```graphql
query {
  readUsers(options: { pagination: { limit: 50 } }) {
    userId
    username
    email
    bio
  }
}
```

This query requests the same 4 fields, but on **50 users**. The complexity calculation becomes:

- Base complexity of 4 fields × 50 users (the limit) = **200 complexity points**

The `limit: 50` argument multiplies the cost because the query is asking for 50 items instead of 1. The guard assumes
the worst case: the client asked for 50, so we cost it as 50.

**Why the list multiplier matters:**

Broad list queries are often what drive cost spikes. A query that requests 100 users with 5 fields each costs
significantly more than a query that requests 1 user with 100 fields. The multiplier captures this reality.

**Complexity scoring formula (simplified):**

```
For each field in the query:
  - Base complexity = 1 point
  - If the field is a list, multiply by the pagination limit (capped at 50)
  - Add the complexity of nested selections below it
```

**Real example from the codebase:**

This test query:

```graphql
query TooExpensive {
  readUsers(options: { pagination: { limit: 50 } }) {
    userId
    username
    bio
  }
}
```

- 3 scalar fields requested
- From 50 users (due to `limit: 50`)
- Base cost: ~56 complexity points
- If the complexity limit is set to 20, this query gets rejected

**Why we cap the list multiplier at 50:**

The `MAX_ARGUMENT_LIST_MULTIPLIER = 50` rule means: "Even if you ask for 10,000 items, we'll cost your query as if you
asked for 50." This prevents a client from requesting 10,000 items and burning through the complexity budget with a
single argument.

**Default complexity limits by stage:**

| Stage | Max Complexity | Why?                                                     |
| ----- | -------------- | -------------------------------------------------------- |
| Dev   | 600            | Very permissive for developers testing complex features  |
| Beta  | 300            | Reasonable limit for feature validation and load testing |
| Gamma | 400            | Slightly higher than Beta for final validation           |
| Prod  | 250            | Tight controls to protect production infrastructure      |

**Key insight:** A query with high depth (many levels) and high breadth (many fields at each level) on a large list
multiplier will quickly exceed the complexity limit and get rejected.

---

#### Understanding Introspection Blocking

**What is introspection?** Introspection is GraphQL's ability to query the schema itself—to ask "what fields exist?" and
"what types are available?"

When you query the `__schema` field, you're performing introspection. This is useful during development (IDEs use it for
autocomplete), but it's a security risk in production:

- An attacker can enumerate your entire schema
- They can discover field names, types, and relationships
- They can identify less-protected endpoints or new features not yet hardened

**Example introspection query:**

```graphql
query SchemaDiscovery {
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
  }
}
```

**Introspection defaults:**

| Stage | Introspection Allowed | Why?                                                   |
| ----- | --------------------- | ------------------------------------------------------ |
| Dev   | ✅ Yes                | Developers need it for local development and testing   |
| Beta  | ✅ Yes                | Tools and CI/CD may still need it for validation       |
| Gamma | ✅ Yes                | Pre-production, still in validation phase              |
| Prod  | ❌ No                 | Disable by default to prevent schema discovery attacks |

Any query containing a field starting with `__` (like `__schema`, `__typename` for type discovery, etc.) will be
rejected in Prod unless explicitly enabled via the override environment variable.

---

#### The Complete Picture: When Guards Execute

Here's the request flow:

```
1. Client sends GraphQL query
   ↓
2. API Gateway receives it (throttles by request count)
   ↓
3. WAF evaluates it (checks for known attack patterns)
   ↓
4. Request reaches Apollo Server
   ↓
5. GraphQL parses the query (validates syntax)
   ↓
6. >>> QUERY GUARDS RUN HERE <<<
   - Check depth: Is nesting ≤ maxDepth?
   - Check complexity: Is cost ≤ maxComplexity?
   - Check introspection: Is `__*` allowed?
   ↓
7. If any guard fails → REJECT with 400 Bad Request (STOPS HERE)
   ↓
8. If all guards pass → Continue to resolver execution
   ↓
9. Resolvers execute database queries
```

The critical point: **guards run before resolvers**, so they prevent expensive work from ever starting.

---

#### Configuration and Overrides

**Default guardrails:**

| Stage | Max Depth | Max Complexity | Introspection Default |
| ----- | --------- | -------------- | --------------------- |
| Dev   | 14        | 600            | Enabled               |
| Beta  | 10        | 300            | Enabled               |
| Gamma | 10        | 400            | Enabled               |
| Prod  | 8         | 250            | Disabled              |

**Environment variable overrides:**

You can adjust these limits via environment variables:

- `GRAPHQL_QUERY_MAX_DEPTH` — override the max depth limit
- `GRAPHQL_QUERY_MAX_COMPLEXITY` — override the max complexity limit
- `GRAPHQL_ALLOW_INTROSPECTION` — set to `true` to enable introspection in Prod

**Example:** To allow deeper queries in Beta during a specific feature rollout:

```bash
GRAPHQL_QUERY_MAX_DEPTH=15 npm run dev:api
```

---

#### Important Limitations: This is Heuristic, Not Perfect

**What query guards DO:**

- ✅ Block obviously expensive queries before they reach resolvers
- ✅ Prevent depth-based attacks (excessively nested traversals)
- ✅ Stop list queries with unreasonable pagination limits
- ✅ Disable schema introspection in production
- ✅ Add a fast, pre-resolver cost check layer

**What query guards DON'T do:**

- ❌ Account for resolver-specific cost (some fields are intrinsically expensive)
- ❌ Know about database query complexity (a join might be fast or slow)
- ❌ Understand caching behavior (some results are cached, others require DB hits)
- ❌ Prevent N+1 query problems at the resolver level
- ❌ Track cumulative cost across multiple queries in a session

**In other words:** Complexity scoring is a heuristic. It's much better than nothing, but it's not a perfect cost model.

**The next layer of hardening** would involve:

- Field-specific weighting (marking expensive resolvers as higher cost)
- Stricter pagination caps on the hottest public operations
- Resolver-level timeouts to catch unexpectedly slow queries
- Database query monitoring and alerts
- Rate limiting per authenticated user (not just per IP)

---

#### Examples: What Gets Rejected?

**Example 1: Too deep**

```graphql
query {
  readUsers {
    address {
      city {
        state {
          country {
            continent {
              planet
            }
          }
        }
      }
    }
  }
}
```

If `maxDepth: 4`:

- This query goes 6 levels deep
- **REJECTED**: "Query depth 6 exceeds the maximum allowed depth of 4."

**Example 2: Too complex**

```graphql
query {
  readUsers(options: { pagination: { limit: 50 } }) {
    userId
    username
    email
    bio
    profile {
      bio
      avatar
      coverImage
    }
    posts(options: { pagination: { limit: 20 } }) {
      postId
      title
      body
      createdAt
    }
    comments(options: { pagination: { limit: 30 } }) {
      commentId
      text
      createdAt
    }
  }
}
```

- 50 users × 7 fields = 350 complexity for users
- 50 × 20 posts × 4 fields = 4,000 complexity for posts
- 50 × 30 comments × 3 fields = 4,500 complexity for comments
- **Total: ~8,850 complexity**
- If `maxComplexity: 250`, **REJECTED**: "Query complexity 8850 exceeds the maximum allowed complexity of 250."

**Example 3: Introspection in Prod**

```graphql
query {
  __schema {
    types {
      name
    }
  }
}
```

If running in `Prod` with default introspection disabled:

- **REJECTED**: "Schema introspection is disabled for this stage."

---

#### When to Adjust Guard Limits

**Increase limits if:**

- Legitimate application queries are being blocked
- You're rolling out new features that require deeper nesting or broader lists
- Your complexity calculations are too conservative for your workload

**Decrease limits if:**

- You're seeing cost spikes from expensive queries
- You're in pre-production (Beta/Gamma) and want to tighten controls before Prod
- You want to be more aggressive about rejecting potentially abusive queries

**How to monitor:**

Look for HTTP 400 errors with messages like:

- "Query depth X exceeds the maximum allowed depth of Y"
- "Query complexity X exceeds the maximum allowed complexity of Y"
- "Schema introspection is disabled"

These indicate queries hitting the guard limits. If they're legitimate queries, increase the limits. If they're attack
attempts, the guards are working.

### 2. WebSocket throttling and payload validation

Implemented in:

- `infrastructure/cdk/lib/constants/websocket-security.ts`
- `infrastructure/cdk/lib/stack/websocket-stack.ts`
- `apps/api/lib/validation/zod/websocket.ts`
- `apps/api/lib/websocket/routes/*`
- `apps/api/lib/websocket/lambdaHandler.ts`

What changed:

- API Gateway WebSocket stage throttling is now enabled.
- Route-specific throttles were added for:
  - `ping`
  - `notification.subscribe`
  - `chat.send`
  - `chat.read`
- WebSocket payloads are now schema-validated before route logic runs.
- Unsupported websocket actions now return `400` instead of silently succeeding through `$default`.
- GraphQL-style application errors now map to client-facing websocket responses instead of collapsing into generic
  `500`s.

Supported environment overrides:

- `WEBSOCKET_STAGE_THROTTLE_RATE_LIMIT`
- `WEBSOCKET_STAGE_THROTTLE_BURST_LIMIT`
- `WEBSOCKET_PING_RATE_LIMIT`
- `WEBSOCKET_PING_BURST_LIMIT`
- `WEBSOCKET_SUBSCRIBE_RATE_LIMIT`
- `WEBSOCKET_SUBSCRIBE_BURST_LIMIT`
- `WEBSOCKET_CHAT_SEND_RATE_LIMIT`
- `WEBSOCKET_CHAT_SEND_BURST_LIMIT`
- `WEBSOCKET_CHAT_READ_RATE_LIMIT`
- `WEBSOCKET_CHAT_READ_BURST_LIMIT`

Important note:

- API Gateway WebSocket throttling helps with burst shaping and noisy clients, but it is not equivalent to a WAF in
  front of the websocket edge.

### 3. User enumeration and login hardening

Implemented in:

- `apps/api/lib/mongodb/models/authAttempt.ts`
- `apps/api/lib/mongodb/dao/authAttempt.ts`
- `apps/api/lib/utils/requestMetadata.ts`
- `apps/api/lib/graphql/resolvers/user.ts`
- `apps/webapp/components/users/UsersPageClient.tsx`

What changed:

- Login now tracks repeated failures by both email and source IP.
- Temporary lockouts are applied after repeated failures.
- Sensitive user reads were tightened:
  - `readUsers` now requires authentication.
  - `readUserByEmail` now allows only admins, hosts, or the matching authenticated user.
  - public `readUserById` and `readUserByUsername` still work, but sensitive fields are redacted unless the caller is
    admin, host, or the matching user.
- The webapp community directory now requires sign-in instead of exposing a public user index.

Current lockout defaults:

- failure window: `15` minutes
- lockout duration: `15` minutes
- threshold: `8` failed attempts

Important note:

- This is a baseline credential-stuffing control. It does not replace CAPTCHA, adaptive risk scoring, or abuse alerting.

### 4. GitHub OIDC hardening

Implemented in:

- `infrastructure/cdk/lib/stack/github-auth-stack.ts`
- `infrastructure/cdk/lib/github-auth-app.ts`

What changed:

- The GitHub OIDC trust policy no longer accepts a blanket repo-wide subject.
- Trust is restricted to exact protected environment subjects used by deployment.
- `AdministratorAccess` was removed.
- The deploy role now uses an inline policy that is still broad, but is scoped to the service set currently needed by
  deployment rather than unconstrained admin.

Current trusted GitHub subjects:

- `environment:Beta-af-south-1`
- `environment:Prod-af-south-1`
- `environment:dns-af-south-1`

Important note:

- This is not the end state. The deploy role still has wildcard-resource permissions across several services, including
  IAM.

## Verification

The following checks were run successfully in this worktree:

- `npm run build:ts -w @gatherle/api`
- `npm exec -w @gatherle/api jest -- --config=test/unit/jest.config.ts --runInBand --runTestsByPath test/unit/spec/graphql/security/queryGuards.test.ts --coverage=false`
- `npm run typecheck -w @gatherle/webapp`
- `STAGE=Beta AWS_REGION=af-south-1 npm run build:cdk -w @gatherle/cdk`
- `AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=327319899143 npm run build:cdk:github-auth -w @gatherle/cdk`

Additional note:

- `npm run typecheck -w @gatherle/api` still reports unrelated pre-existing test-type failures outside this change set.

## Residual Risks

The largest remaining gaps after this phase are:

1. WebSocket distributed-abuse handling
   - There is still no WAF-equivalent protection path for API Gateway WebSocket.
   - Next step: add alarms, connection-level spam controls, and short-lived websocket connect tickets.

2. Public-profile contract design
   - The schema still uses a single `User` type for both public and private reads.
   - Next step: introduce a dedicated public-profile type or field-level authorization model so redaction is not
     resolver-by-resolver.

3. CI/CD least privilege
   - The deploy role is narrower than before, but still too broad for a mature production posture.
   - Next step: split deploy roles by stack/environment and remove wildcard-resource IAM access.

4. Auth abuse detection
   - Lockouts exist, but there is no CAPTCHA, adaptive risk engine, or CloudWatch/SIEM alerting for spikes.

5. Edge monitoring
   - The repo still needs explicit alarms for WAF blocks, GraphQL throttles, websocket throttles, login spikes, and
     concurrency anomalies.

## Recommended Next Phase

1. Add CloudWatch alarms and budget alerts for:
   - WAF block rate
   - API Gateway `4xx`/`429`
   - Lambda concurrency and errors
   - websocket throttles
   - login lockout spikes
2. Replace long-lived websocket bearer auth with short-lived connect tickets.
3. Split GitHub deploy roles by concern:
   - runtime deploy
   - DNS deploy
   - secrets/bootstrap deploy
4. Design a dedicated public-profile GraphQL contract so public data exposure is explicit in schema, not implicit in
   resolver logic.
