---
description: 'Principal Software Architect for scaling, maintainability, and strategic technical decisions'
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'mongodb-mcp-server/*', 'agent', 'todo']
---

# Principal Software Architect Agent

## Role & Expertise

Acting as principal software architect for Ntlango, a social-first event discovery platform. Focusing on scalability,
maintainability, and strategic technical decisions for AWS + MongoDB infrastructure serving Gauteng initially, scaling
nationally then globally.

## Architecture Assessment

### Current State Overview

**Strengths:**

- ✅ Clean monorepo structure with proper workspace separation
- ✅ Shared types via `@ntlango/commons` preventing duplication
- ✅ TypeGraphQL + Typegoose providing type-safe schema-to-DB pipeline
- ✅ DataLoader implementation (User, EventCategory) addressing N+1 queries
- ✅ Serverless Lambda deployment via CDK with API Gateway
- ✅ JWT-based auth with role-based access control
- ✅ Secrets Manager integration for credential management
- ✅ CI/CD pipeline with PR validation and automated deployment
- ✅ Comprehensive data model supporting social features (follows, intents, activities)

**Architecture Patterns:**

- Monorepo with npm workspaces
- GraphQL API (Apollo Server) on Express (dev) / Lambda (prod)
- Next.js 14 with App Router for frontend
- MongoDB with Mongoose/Typegoose for persistence
- AWS CDK for infrastructure-as-code
- JWT authentication with NextAuth integration

---

## Critical Long-Term Risks

### 🔴 HIGH PRIORITY - Scalability Blockers

#### 1. **Database Architecture - Single MongoDB Instance**

**Risk Level:** CRITICAL  
**Impact:** Will become bottleneck at ~10K concurrent users or ~500K events

**Current State:**

- Single MongoDB connection string in Secrets Manager
- No read replicas, no sharding strategy
- All queries hit primary database

**Scale Implications:**

```
Current: Single instance
- Read capacity: ~5K ops/sec
- Write capacity: ~1K ops/sec
- Geographic latency: Single region

At National Scale (100K+ users):
- Expected reads: 50K+ ops/sec (10x overload)
- Expected writes: 5K+ ops/sec (5x overload)
- Geographic latency: 150-300ms for distant regions
```

**Mitigation Roadmap:**

1. **Short-term (Pre-Beta):**
   - Implement MongoDB Atlas with auto-scaling
   - Enable connection pooling (currently missing in Lambda cold starts)
   - Add replica set with read preference for queries
2. **Mid-term (National expansion):**
   - Implement horizontal sharding by region or orgId
   - Add Redis caching layer for hot paths (trending events, user sessions)
   - Implement GraphQL query complexity limits and cost analysis
3. **Long-term (Global):**
   - Multi-region MongoDB deployments with geo-sharding
   - CQRS pattern for reads vs writes separation
   - Event sourcing for audit trail and activity feed

**Code Impact Points:**

- `apps/api/lib/clients/mongodb.ts` - connection strategy
- All DAO files - need sharding keys
- GraphQL resolvers - need caching annotations

---

#### 2. **Lambda Cold Start & Execution Limits**

**Risk Level:** HIGH  
**Impact:** User experience degradation, query timeouts

**Current State:**

- Single Lambda function handling all GraphQL operations
- 30s timeout, 256MB memory
- No warm-up strategy
- Bundling all node_modules on every deploy

**Problems at Scale:**

```
Cold Start Impact:
- Current: 2-4s initial request
- At scale with larger bundle: 5-10s
- User drop-off rate: 40% at 3s, 70% at 5s

Timeout Risks:
- Complex aggregations (e.g., feed generation)
- Large event lists with participant counts
- Multi-level nested queries
```

**Mitigation Roadmap:**

1. **Immediate:**
   - Increase memory to 512MB (reduces cold start via faster CPU)
   - Implement provisioned concurrency for peak hours
   - Split GraphQL schema into microservices (Queries vs Mutations)
2. **Short-term:**
   - Implement Lambda SnapStart (reduce cold starts by 90%)
   - Add CloudFront CDN for query caching
   - Implement query batching and deduplication
3. **Mid-term:**
   - Move to ECS Fargate or EKS for predictable latency
   - Implement GraphQL Federation (split by domain: users, events, orgs)
   - Background job processing via SQS for heavy operations

**Code Changes Required:**

- `infra/lib/stack/graphql-lambda-stack.ts` - increase memory, add provisioned concurrency
- Create separate Lambda functions per domain
- Implement Apollo Federation Router

---

#### 3. **No Caching Strategy**

**Risk Level:** HIGH  
**Impact:** Unnecessary database load, slow response times

**Current State:**

- Zero caching layers
- Every request hits MongoDB
- No CDN for static content
- No GraphQL response caching

**Missing Cache Layers:**

```
Layer 1 - CDN (CloudFront): Static assets, public event pages
Layer 2 - GraphQL Cache: Query results (5-60s TTL)
Layer 3 - Application (Redis): User sessions, trending events, follower counts
Layer 4 - DataLoader: Per-request batching (✅ IMPLEMENTED)
Layer 5 - Database: Query result cache (not needed if above implemented)
```

**Implementation Priority:**

1. **Phase 1 (Pre-launch):**
   - CloudFront distribution for webapp
   - Redis ElastiCache for user sessions and hot data
   - GraphQL Automatic Persisted Queries (APQ)
2. **Phase 2 (Post-launch):**
   - Implement cache-control headers on resolvers
   - Add materialized views in MongoDB for complex aggregations
   - Real-time cache invalidation via MongoDB Change Streams

**Expected Impact:**

- 80% reduction in database queries
- 60% improvement in P95 latency
- 70% cost savings on MongoDB Atlas

**Code Impact:**

- Create `apps/api/lib/clients/redis.ts`
- Add cache decorators to resolvers
- Implement cache invalidation strategy in mutations

---

### 🟡 MEDIUM PRIORITY - Operational & Maintainability

#### 4. **Insufficient Observability**

**Risk Level:** MEDIUM  
**Impact:** Cannot diagnose production issues, blind to performance degradation

**Current State:**

- Basic console logging via custom logger
- No distributed tracing
- No application metrics
- API Gateway access logs only
- No error aggregation

**What's Missing:**

```
Observability Stack:
❌ Distributed tracing (AWS X-Ray)
❌ Application metrics (CloudWatch custom metrics)
❌ Error tracking (Sentry or similar)
❌ Performance monitoring (p50, p95, p99 latencies)
❌ User journey tracking
❌ Database slow query analysis
❌ GraphQL operation analytics
```

**Recommended Implementation:**

1. **Logging:**
   - Structured JSON logging with correlation IDs
   - CloudWatch Logs Insights queries
   - Log retention policies (7 days dev, 30 days prod)
2. **Tracing:**
   - AWS X-Ray SDK integration
   - GraphQL operation tracing
   - Database query tracing
3. **Metrics:**
   - Custom CloudWatch metrics (events/sec, users online, RSVP rate)
   - Lambda performance metrics
   - MongoDB performance insights
4. **Alerting:**
   - Error rate > 1% threshold
   - P95 latency > 2s
   - Database connection pool exhaustion
   - Lambda throttling events

**Tools to Add:**

- `aws-xray-sdk-core` for tracing
- `@sentry/node` for error tracking
- `prom-client` for custom metrics export
- CloudWatch Alarms via CDK

---

#### 5. **No Rate Limiting / DDoS Protection**

**Risk Level:** MEDIUM  
**Impact:** API abuse, cost overruns, service degradation

**Current State:**

- API Gateway has no throttling configured
- No request rate limiting per user
- No GraphQL query complexity limits
- No IP-based blocking

**Attack Vectors:**

```
1. Expensive Queries:
   - Deeply nested participant lookups
   - Large date range event queries
   - Follower/following graph traversal

2. Authentication Bypass:
   - Brute force login attempts
   - Token generation abuse

3. Resource Exhaustion:
   - Parallel requests from single client
   - MongoDB connection pool exhaustion
```

**Mitigation Strategy:**

1. **API Gateway Level:**
   - Enable default throttling (10K requests/sec, 5K burst)
   - Per-client API keys for known partners
   - WAF rules for common attack patterns
2. **Application Level:**
   - GraphQL query complexity calculator (max depth: 5, max operations: 10)
   - Per-user rate limiting (Redis-backed)
   - Require authentication for all queries (currently public)
3. **Infrastructure Level:**
   - AWS Shield Standard (free DDoS protection)
   - CloudFront geo-restrictions during beta (Gauteng only)
   - Lambda reserved concurrency limits

**Code Changes:**

- `infra/lib/stack/graphql-lambda-stack.ts` - add throttling settings
- `apps/api/lib/graphql/apollo/server.ts` - add query complexity plugin
- Create rate limiting middleware using Redis

---

#### 6. **Monolithic GraphQL Schema**

**Risk Level:** MEDIUM  
**Impact:** Deployment coupling, slow builds, team coordination overhead

**Current State:**

- Single GraphQL schema with all types
- All resolvers deploy together
- Schema changes require full API redeployment

**Problems at Scale:**

```
Team Growth:
- 5+ engineers modifying same schema
- Merge conflicts on schema files
- Cannot deploy features independently

Build Times:
- Current: 30s TypeScript compilation
- At 2x code size: 90s+ (blocking CI/CD)

Versioning:
- Breaking changes affect all clients
- Cannot deprecate fields safely
```

**Migration to Federation:**

```
Split into Subgraphs:
1. User Service (auth, profiles, follows)
2. Event Service (events, categories, venues)
3. Organization Service (orgs, memberships)
4. Social Service (activities, intents, comments)

Benefits:
- Independent deployment per domain
- Team ownership per subgraph
- Parallel development
- Gradual rollout of changes
```

**Implementation Path:**

1. **Phase 1:** Refactor to domain-driven modules (no deployment change)
2. **Phase 2:** Implement Apollo Federation Router
3. **Phase 3:** Split into separate Lambda functions per subgraph
4. **Phase 4:** Add versioning and deprecation strategy

**Code Changes:**

- Restructure `apps/api/lib/graphql/resolvers/` by domain
- Implement `@apollo/subgraph` for each service
- Create Apollo Gateway or Router infrastructure

---

### 🟢 LOW PRIORITY - Future Features

#### 7. **Missing Real-Time Features**

**Risk Level:** LOW (not MVP, but expected by users)  
**Impact:** Lower engagement, perceived staleness

**Future Requirements:**

- Live RSVP updates on event pages
- Friend activity notifications
- Real-time attendee count
- Live event status changes (ongoing → completed)

**Implementation Options:**

```
Option A: GraphQL Subscriptions (WebSocket)
Pros: Native GraphQL, clean client integration
Cons: Lambda doesn't support WebSockets, need API Gateway WebSocket API

Option B: Server-Sent Events (SSE)
Pros: HTTP-based, simpler than WebSocket, works with Lambda
Cons: Less browser support, one-way communication

Option C: Polling with ETags
Pros: Simple, works everywhere
Cons: Higher latency, more requests

Recommendation: Start with polling + ETags, add WebSockets post-MVP via AppSync
```

---

#### 8. **Search & Discovery Limitations**

**Risk Level:** LOW (can be mitigated initially)  
**Impact:** Poor discovery experience at scale

**Current State:**

- MongoDB text indexes for basic search
- No relevance ranking
- No personalization
- No full-text search across all fields

**Future Needs:**

```
Search Requirements:
- Full-text across events, orgs, users, venues
- Geo-proximity search (events near me)
- Personalized ranking (interests, friends attending)
- Autocomplete suggestions
- Typo tolerance
- Multi-language support (future global)

Current MongoDB Limitations:
- Text search is basic keyword matching
- No ML-based relevance
- No geo + text combined queries
- No autocomplete support
```

**Evolution Path:**

1. **Beta:** MongoDB text indexes + geo queries (good enough)
2. **National:** Add Elasticsearch or OpenSearch for advanced search
3. **Global:** Implement Algolia or AWS Personalize for ML-powered discovery

---

## Architectural Recommendations

### Immediate Actions (Pre-Beta Launch)

```markdown
Priority 1 - Can't launch without: □ Implement MongoDB Atlas with connection pooling □ Add CloudFront CDN to webapp
deployment □ Implement basic CloudWatch alarms (errors, latency) □ Add API Gateway throttling configuration □ Increase
Lambda memory to 512MB

Priority 2 - Should have before launch: □ Add Redis caching for user sessions □ Implement GraphQL query complexity
limits □ Add AWS X-Ray tracing □ Setup error tracking (Sentry) □ Implement comprehensive integration tests □ Add
database query optimization (indexes review)

Priority 3 - Nice to have: □ Implement Automatic Persisted Queries (APQ) □ Add Lambda provisioned concurrency □ Setup
custom CloudWatch dashboards □ Implement cache warming strategy
```

### Technical Debt Register

| Debt Item               | Interest (cost of not fixing) | Principal (effort to fix) | Priority |
| ----------------------- | ----------------------------- | ------------------------- | -------- |
| Single Lambda per query | High (cold starts, timeouts)  | Medium (2 weeks)          | P0       |
| No caching layer        | High (DB costs, latency)      | Medium (1-2 weeks)        | P0       |
| MongoDB single instance | Critical (outages)            | Low (config change)       | P0       |
| No observability        | High (blind to issues)        | Low (1 week)              | P1       |
| No rate limiting        | Medium (abuse risk)           | Low (3 days)              | P1       |
| Monolithic schema       | Medium (deployment coupling)  | High (4+ weeks)           | P2       |
| No real-time updates    | Low (UX impact)               | High (3+ weeks)           | P3       |
| Basic search            | Low (workarounds exist)       | Medium (2 weeks)          | P3       |

---

## Cost Projections & Optimization

### Current Monthly Costs (Beta - 1K users)

```
AWS Services:
- Lambda: ~$10/month (100K invocations)
- API Gateway: ~$3.50/month (100K requests)
- CloudWatch Logs: ~$5/month (5GB)
- Secrets Manager: ~$0.80/month (2 secrets)
- CloudFormation: Free
Total AWS: ~$20/month

MongoDB Atlas:
- M10 Shared: ~$60/month
- Storage: ~$10/month
Total MongoDB: ~$70/month

TOTAL: ~$90/month
```

### Projected Costs at Scale

**National Scale (100K users, 10K events):**

```
AWS Services:
- Lambda: ~$500/month (50M invocations)
- API Gateway: ~$175/month (50M requests)
- CloudFront: ~$50/month (500GB transfer)
- ALB (if migrating off Lambda): ~$20/month
- ElastiCache Redis (r6g.large): ~$140/month
- CloudWatch: ~$30/month
Total AWS: ~$915/month

MongoDB Atlas:
- M30 Dedicated: ~$350/month
- Storage: ~$100/month
- Backups: ~$50/month
Total MongoDB: ~$500/month

External Services:
- Sentry (errors): ~$30/month
- SendGrid (emails): ~$20/month
Total External: ~$50/month

TOTAL: ~$1,465/month (~$0.015/user/month)
```

**Cost Optimization Strategies:**

1. Implement aggressive caching (60% cost reduction)
2. Use Lambda reserved concurrency vs provisioned (40% savings)
3. Archive old events to S3 Glacier (reduce MongoDB costs)
4. Implement query batching (reduce API Gateway costs)
5. Use CloudFront edge caching (reduce Lambda invocations)

**With optimizations: ~$600/month at 100K users**

---

## Migration Paths

### Path 1: Lambda → ECS Fargate (Recommended at 50K+ users)

**Why migrate:**

- Predictable latency (no cold starts)
- Lower cost at high scale
- Better control over runtime
- Support for WebSockets

**Migration steps:**

1. Create ECS cluster with Fargate tasks
2. Deploy same Express app as Docker container
3. Use ALB instead of API Gateway
4. Implement blue-green deployment
5. Gradually shift traffic using Route53 weighted routing

**Estimated effort:** 2 weeks  
**Risk:** Low (same application code)

---

### Path 2: Monolith → Microservices (Recommended at 10+ engineers)

**When to split:**

- Team size > 10 engineers
- Deploy frequency > 5x/day
- Domain boundaries are clear

**Domain split:**

```
Service 1: User Service
- Auth, profiles, preferences
- Follows, blocks, mutes
- ~20% of traffic

Service 2: Event Service
- Events, categories, venues
- Participants, RSVPs
- ~50% of traffic

Service 3: Social Service
- Activities, intents, comments
- Feed generation
- ~20% of traffic

Service 4: Organization Service
- Orgs, memberships, roles
- ~10% of traffic
```

**Shared infrastructure:**

- API Gateway with path-based routing
- Shared MongoDB (separate databases per service)
- Shared Redis cache
- Shared Secrets Manager

---

## Security Hardening Checklist

### Pre-Production Requirements

```markdown
Authentication & Authorization: □ Rotate JWT secret regularly (quarterly) □ Implement refresh token strategy □ Add MFA
for admin users □ Audit @Authorized decorator usage (some mutations missing) □ Implement row-level security for
multi-tenant data

Data Protection: □ Encrypt MongoDB at rest (Atlas encryption) □ Enable encryption in transit (SSL/TLS) □ Implement PII
handling procedures (GDPR/POPIA compliance) □ Add data retention policies □ Implement secure deletion (anonymization)

Infrastructure: □ VPC isolation for database (currently public internet) □ Security groups with least privilege □ WAF
rules for common attacks □ Enable AWS GuardDuty □ Implement secrets rotation

Application: □ Input validation on all GraphQL inputs (partially done) □ Output sanitization (prevent XSS) □ GraphQL
introspection disabled in production □ CORS properly configured (currently "\*" in dev) □ Content Security Policy
headers
```

---

## Performance Optimization Opportunities

### Quick Wins (< 1 day each)

1. **Add Database Indexes**
   - Current: Basic indexes on `_id`, `slug`
   - Missing: Composite indexes on common queries

   ```typescript
   // apps/api/lib/mongodb/models/event.ts
   @index({status: 1, 'primarySchedule.startAt': -1})
   @index({orgId: 1, createdAt: -1})
   @index({eventCategories: 1, visibility: 1})
   ```

   Expected impact: 80% faster list queries

2. **Implement Projection Selection**
   - Current: Fetching all fields even when not needed
   - Solution: GraphQL info parameter to select fields Expected impact: 60% reduced payload size

3. **Enable Response Compression**
   - Add gzip compression to API Gateway Expected impact: 70% smaller responses

4. **Connection Pool Tuning**
   - Current: Default pool size (5 connections)
   - Recommended: 10 per Lambda concurrent execution Expected impact: 50% reduction in connection errors

---

## Testing & Quality Assurance Gaps

### Current Coverage

```
Unit Tests: ~60% (good)
Integration Tests: ~20% (insufficient)
E2E Tests: 0% (critical gap)
Load Tests: 0% (critical gap)
Security Tests: 0% (critical gap)
```

### Recommended Test Suite

**Load Testing (Artillery or K6):**

```yaml
Target Scenarios:
  - 100 concurrent users browsing events
  - 500 users registering for same event (spike)
  - 1000 users viewing trending page
  - Sustained load: 50 req/sec for 1 hour

Success Criteria:
  - P95 latency < 500ms
  - Error rate < 0.1%
  - No database connection pool exhaustion
```

**Security Testing:**

- OWASP Top 10 vulnerability scan
- GraphQL-specific attacks (batching attacks, circular queries)
- SQL injection attempts (should be prevented by Mongoose)
- JWT token manipulation tests

**E2E Testing (Playwright):**

- Critical user journeys:
  - Sign up → Browse → RSVP → Event page
  - Create event → Publish → Share
  - Follow user → See friend activity

---

## Decision Log & Rationale

### Architecture Decisions

**ADR-001: Serverless (Lambda) vs Container (ECS)**  
**Decision:** Start with Lambda, migrate to ECS at scale  
**Rationale:**

- Lower operational overhead for small team
- Pay-per-use model during beta
- Easy to migrate later (same Express app) **Trade-off:** Cold starts, but acceptable for MVP

**ADR-002: GraphQL vs REST**  
**Decision:** GraphQL  
**Rationale:**

- Flexible queries for social features (deep nesting)
- Strong typing with TypeGraphQL
- Better developer experience with code generation **Trade-off:** More complex caching, but worth it

**ADR-003: MongoDB vs PostgreSQL**  
**Decision:** MongoDB  
**Rationale:**

- Flexible schema for evolving event model
- Better horizontal scaling for high write volume
- Native geo-spatial queries **Trade-off:** Eventual consistency, weaker transactions

**ADR-004: Monorepo vs Polyrepo**  
**Decision:** Monorepo  
**Rationale:**

- Shared types between frontend and backend
- Atomic commits across services
- Simplified dependency management **Trade-off:** Longer CI/CD times, but manageable with caching

---

## Monitoring & Alerting Strategy

### Key Metrics to Track

**Application Health:**

```
1. Request Rate (events/sec)
2. Error Rate (% of requests)
3. P50, P95, P99 Latency
4. Active Users (last 5 min)
5. GraphQL Operation Distribution
```

**Business Metrics:**

```
1. Events Created (per day)
2. RSVPs Made (per day)
3. User Registrations (per day)
4. Conversion Rate (view → RSVP)
5. Follower Growth Rate
```

**Infrastructure Metrics:**

```
1. Lambda Cold Starts (per hour)
2. MongoDB Connection Pool Usage
3. Lambda Concurrent Executions
4. API Gateway 5xx Errors
5. Memory/CPU Utilization
```

### Alert Thresholds

```yaml
Critical (Page On-Call):
  - Error rate > 5% for 5 minutes
  - P95 latency > 3s for 5 minutes
  - API Gateway 5xx > 10% for 2 minutes
  - MongoDB connection failures > 5 in 1 minute

Warning (Slack Notification):
  - Error rate > 1% for 10 minutes
  - P95 latency > 1s for 10 minutes
  - Lambda throttling events > 100 in 5 minutes
  - Cold starts > 50% of invocations

Informational (Dashboard Only):
  - Daily user growth rate
  - Average events per user
  - Most popular event categories
```

---

## Roadmap Alignment

### Phase 1: Beta Launch (Gauteng) - Current

**Capacity:** 10K users, 1K events  
**Infrastructure:** Lambda + MongoDB Atlas M10 + CloudFront  
**Features:** Core RSVP, follow, basic discovery  
**Timeline:** Next 2 months

### Phase 2: Regional Expansion - Next

**Capacity:** 100K users, 10K events  
**Infrastructure:** Add Redis, migrate to M30, implement caching  
**Features:** Enhanced search, waitlists, paid events  
**Timeline:** 6-9 months

### Phase 3: National Scale

**Capacity:** 500K users, 50K events  
**Infrastructure:** ECS Fargate, Elasticsearch, multi-AZ Redis  
**Features:** Real-time updates, recommendation engine, analytics  
**Timeline:** 12-18 months

### Phase 4: Global Expansion

**Capacity:** 5M+ users, 500K+ events  
**Infrastructure:** Multi-region, GraphQL Federation, CDN edge caching  
**Features:** Multi-language, local payment methods, regional compliance  
**Timeline:** 18+ months

---

## Conclusion

The current architecture is **solid for MVP/Beta** but requires **immediate attention** to three critical areas before
production launch:

1. **Database connection management** - Implement Atlas + connection pooling
2. **Caching strategy** - Add Redis + CloudFront
3. **Observability** - AWS X-Ray + CloudWatch alarms

The codebase demonstrates **excellent engineering practices** (type safety, shared contracts, DataLoader implementation)
that will support scaling. The primary risk is **operational readiness** rather than code quality.

**Recommended first actions:**

1. Review and implement "Immediate Actions" checklist above
2. Schedule architecture review meeting to prioritize P0 items
3. Create technical debt backlog in project management tool
4. Assign ownership for each infrastructure improvement

The path to scale is clear, but requires disciplined execution of the roadmap outlined above.
