# Gatherle Threat Model & Risk Register

Created: 2026-02-22

## Scope

This threat model covers the current Gatherle architecture in this repository:

- GraphQL API in `apps/api`
- WebSocket realtime services in `apps/api/lib/websocket`
- Webapp in `apps/webapp`
- AWS CDK infrastructure in `infrastructure/cdk`
- GitHub Actions CI/CD in `.github/workflows`
- DNS and custom domain model (`Gatherle-dns` + runtime account split)

It is a practical engineering risk model, not a formal penetration test.

## Security Baseline (What Is Already Good)

- AWS Secrets Manager is used for backend runtime secrets by stage+region name.
- OIDC-based GitHub Actions auth is in place (no static AWS keys required for CI/CD).
- Stage+region-aware stack naming and account mapping exist.
- DNS account and runtime account are separated, reducing blast radius.
- GraphQL authorization patterns (`@Authorized`) and ownership checks exist for sensitive resolvers.

## Trust Boundaries

1. Browser and clients -> API Gateway (GraphQL/WebSocket)
2. API/WebSocket Lambda runtime -> MongoDB and Secrets Manager
3. GitHub Actions -> AWS assume-role boundary
4. Registrar -> Route53 root zone in DNS account -> delegated stage hosted zones in runtime account

## High-Value Assets

- JWT signing secrets and session integrity material
- User and organization data in MongoDB
- CI/CD deploy role permissions
- Route53 hosted zone control and domain certificates

## Risk Scoring

- Likelihood: 1 (low) to 5 (high)
- Impact: 1 (low) to 5 (critical)
- Risk Score: Likelihood x Impact
- Strikethrough text marks resolved risk components that are kept for audit history.

## Risk Register

| ID   | Risk                                                                                                                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    | Likelihood | Impact | Score | Priority |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----- | -------- |
| R-01 | CI/CD AWS role can lead to full account takeover if workflow/repo is compromised                                             | `infrastructure/cdk/lib/stack/github-auth-stack.ts` uses `AdministratorAccess` and broad `sub` pattern (`repo:owner/repo:*`)                                                                                                                                                                                                                                                                                                                | 4          | 5      | 20    | Critical |
| R-02 | ~~JWT secret reuse across webapp auth and API token signing increases blast radius~~                                         | Webapp uses `NEXTAUTH_SECRET` in `apps/webapp/auth.config.ts`; API signs/verifies with `JWT_SECRET` in `apps/api/lib/utils/auth.ts`; deployment now injects `NEXTAUTH_SECRET` via `.github/workflows/deploy.yaml`, and operators confirmed distinct values + rotation.                                                                                                                                                                      | 3          | 5      | 15    | High     |
| R-03 | ~~API signs full user object into JWT instead of minimal claims~~                                                            | `apps/api/lib/utils/auth.ts` now maps to minimal `AuthClaims` (`sub`, `email`, `username`, `userRole`, optional `isTestUser`, `ver`) before signing, and verification enforces required claims/version via `toAuthClaims`                                                                                                                                                                                                                   | 4          | 4      | 16    | High     |
| R-04 | ~~Wildcard CORS broadens attack surface for API and S3 upload flows~~                                                        | API and S3 now use explicit stage-based webapp origin allowlists with optional `CORS_ALLOWED_ORIGINS` overrides instead of `*` in `apps/api/lib/graphql/apollo/*` and `infrastructure/cdk/lib/stack/s3-bucket-stack.ts`                                                                                                                                                                                                                     | 4          | 4      | 16    | High     |
| R-05 | ~~WebSocket query-string token exposure; residual handshake token risk remains (header/subprotocol + long-lived JWT reuse)~~ | Backend extracts `Authorization`/`Sec-WebSocket-Protocol` in `apps/api/lib/websocket/event.ts`; client sends protocol-based token in `apps/webapp/lib/utils/websocket.ts` (`buildWebSocketAuthProtocols`)                                                                                                                                                                                                                                   | 3          | 4      | 12    | High     |
| R-06 | Missing request-abuse controls (GraphQL complexity, throttling, websocket rate limiting) raises DoS/cost risk                | No query depth/cost plugin in `apps/api/lib/graphql/schema/index.ts`; no API throttling config in `infrastructure/cdk/lib/stack/graphql-stack.ts`; no websocket rate limiter in routes                                                                                                                                                                                                                                                      | 4          | 4      | 16    | High     |
| R-11 | No explicit L7 DDoS controls (WAF/rate-based rules) on public API and websocket edges                                        | `infrastructure/cdk/lib/stack/graphql-stack.ts` and `infrastructure/cdk/lib/stack/websocket-stack.ts` do not attach WAF/WebACL or rate-based blocking controls                                                                                                                                                                                                                                                                              | 4          | 5      | 20    | Critical |
| R-12 | User enumeration/data scraping risk via unauthenticated user queries                                                         | `apps/api/lib/graphql/resolvers/user.ts` exposes `readUsers`, `readUserByEmail`, `readUserById`, `readUserByUsername` without `@Authorized`                                                                                                                                                                                                                                                                                                 | 4          | 4      | 16    | High     |
| R-13 | Authentication brute-force/credential stuffing protections are not evident                                                   | Login path in `apps/webapp/data/actions/server/auth/login.ts` -> `signIn` and `apps/api/lib/mongodb/dao/user.ts` lacks attempt throttling/lockout/captcha controls                                                                                                                                                                                                                                                                          | 4          | 4      | 16    | High     |
| R-14 | ~~Unbounded query pagination can be abused for heavy reads and scraping~~                                                    | `apps/api/lib/utils/queries/query.ts` and `apps/api/lib/utils/queries/aggregate/pagination.ts` now enforce `pagination.limit` within `1..50` and reject invalid pagination inputs with `400`                                                                                                                                                                                                                                                | 4          | 3      | 12    | High     |
| R-15 | ~~Webapp response security headers are not explicitly configured (CSP/HSTS/frame/referrer)~~                                 | `apps/webapp/next.config.mjs` now sets stage-aware `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, and production-only `Strict-Transport-Security` headers                                                                                                                                                                                                                                                                 | 3          | 3      | 9     | Medium   |
| R-07 | ~~GraphQL request logging may capture sensitive variables in non-prod stages~~                                               | `apps/api/lib/graphql/apollo/server.ts` logs operation metadata + query fingerprint + variable keys (not raw query text). Variable values are not emitted by the GraphQL request logging plugin.                                                                                                                                                                                                                                            | 3          | 4      | 12    | High     |
| R-08 | Apollo landing page plugin is enabled for all stages                                                                         | `apps/api/lib/graphql/apollo/server.ts` always adds `ApolloServerPluginLandingPageLocalDefault()`                                                                                                                                                                                                                                                                                                                                           | 3          | 3      | 9     | Medium   |
| R-09 | Secrets bootstrap path can accidentally deploy empty/incorrect secret values                                                 | `infrastructure/cdk/lib/stack/secrets-management-stack.ts` uses `unsafePlainText(process.env.* ?? '')`                                                                                                                                                                                                                                                                                                                                      | 3          | 3      | 9     | Medium   |
| R-10 | PR security gates are currently weak (dependency and code scanning not enforced)                                             | `.github/workflows/pr-check.yaml` has `npm audit` disabled and no SAST/IaC security job                                                                                                                                                                                                                                                                                                                                                     | 3          | 3      | 9     | Medium   |
| R-16 | Presigned upload URL abuse: rate-limit bypass + duplicate MediaConvert billing via URL reuse                                 | `apps/api/lib/services/media.ts` `getEventMomentUploadUrl` counts created moments (`EventMomentDAO.countRecentByAuthor`) not issued upload URLs — user can request many upload tokens without ever calling `createEventMoment`. S3 presigned PUT URL is valid for 900 s and can be PUT multiple times; each S3 ObjectCreated trigger fires `startTranscodeJobHandler` independently, creating duplicate MediaConvert jobs for the same key. | 3          | 3      | 9     | Medium   |

## Threat Scenarios (Top Risks)

### R-01: CI/CD role abuse -> account-wide compromise

If a malicious workflow change lands on a trusted branch/repo context, the assumed role currently has admin-level
permissions. This enables destructive infrastructure changes, secret exfiltration, and persistence.

### R-02: ~~Secret reuse across auth surfaces -> multi-surface auth compromise~~

Status (2026-02-22): Resolved. Webapp and API secrets are split, deployment injects `NEXTAUTH_SECRET` separately, and
operators confirmed distinct secret values with rotation.

### R-03: ~~JWT overexposure via full user payload in auth tokens~~

Status (2026-02-22): Resolved in code. API tokens now include only minimal auth claims, and token verification enforces
claim shape + token schema version.

### R-04: ~~Wildcard CORS exposure~~

Status (2026-03-01): Resolved in code. API and S3 now use explicit stage-based webapp origin allowlists, with optional
`CORS_ALLOWED_ORIGINS` overrides for previews or non-default local origins.

### R-05: ~~WebSocket handshake token exposure~~

Query-string token auth has been removed in code, reducing URL leakage risk. Residual risk remains because handshake
credentials can still appear in header-level observability paths and currently use bearer JWTs rather than short-lived
websocket-specific tickets.

Status (2026-02-22): Query-parameter token transport is resolved in code; remaining risk is token lifecycle and
observability hygiene for handshake credentials.

### R-07: ~~GraphQL request logs leaking sensitive variables~~

Status (2026-02-22): Resolved in code. GraphQL request logging no longer stores raw query text, and variable values are
not emitted by the request logging plugin.

### R-16: Presigned upload URL abuse (rate-limit bypass + duplicate MediaConvert billing)

`getEventMomentUploadUrl` enforces a rate limit by counting existing `EventMoment` documents via
`EventMomentDAO.countRecentByAuthor`. Because the limit is tied to created moments rather than issued upload URLs, a
user can repeatedly call the mutation to obtain fresh 900-second presigned PUT URLs without ever calling
`createEventMoment`, bypassing the per-user cap entirely.

Additionally, a presigned S3 PUT URL can be re-used until expiry (900 s). Each PUT to the same key fires an S3
ObjectCreated event → EventBridge → `startTranscodeJobHandler`, which submits a MediaConvert job with no deduplication
guard. Repeated PUTs or replayed events for the same key will create multiple MediaConvert jobs, each incurring real AWS
billing.

Mitigation implemented (2026-04-21): video upload URL issuance now rate-limits before returning a presigned URL,
reserves an unpublished `EventMoment` with `state: UploadPending` and `rawS3Key`, and returns the reserved `momentId`.
`createEventMoment` publishes that reservation with caption/thumbnail metadata instead of creating a second video row.
`startTranscodeJobHandler` atomically claims `UploadPending -> Transcoding` by raw S3 key before submitting
MediaConvert, so repeated PUTs or replayed S3 events no-op after the first claim.

Status (2026-04-21): Mitigated by API-032.

### R-11: L7 DDoS exposure on public API surfaces

Without explicit WAF/rate-based controls at the edge, the system depends primarily on default service-level protections
and app behavior. Targeted bursts can still cause elevated latency, higher cost, and downstream exhaustion in
Lambda/MongoDB.

### R-12: Public user discovery and enumeration

Unauthenticated user read operations allow broad account discovery and potential scraping patterns if request volume is
not constrained and response fields are not minimized for public callers.

### R-14: ~~Unbounded query pagination~~

Status (2026-02-28): Resolved in code. Generic and aggregate pagination helpers now require `pagination.limit` to stay
within `1..50` and reject invalid pagination values with `400`.

### R-15: ~~Webapp response security headers~~

Status (2026-03-01): Resolved in code. The webapp now emits CSP, frame protection, referrer policy, and production-only
HSTS headers from `apps/webapp/next.config.mjs`.

## Required Mitigations

### Immediate (0-7 days)

1. Replace `AdministratorAccess` on GitHub deploy role with least-privilege policy scoped to required
   CDK/CloudFormation/S3/ECR/Secrets actions.
2. Restrict OIDC trust `sub` claims to exact branch/environment patterns used for deploy (for example `main` and
   protected environments), not wildcard repo subject.
3. ~~Split secrets: introduce separate `API_JWT_SIGNING_SECRET` and `NEXTAUTH_SECRET`; rotate both.~~
4. Harden websocket connect auth beyond header/subprotocol migration:
   - Use short-lived websocket connect tickets instead of long-lived JWTs.
   - Ensure token-bearing handshake headers are redacted in all logs/telemetry paths.
   - Keep query-token path permanently disabled.
5. ~~Lock CORS to explicit domain allowlists per stage for API and S3.~~
6. Add explicit L7 DDoS controls:
   - Attach WAF WebACL to GraphQL/API and websocket entry points.
   - Add rate-based rules for abusive IPs/patterns.
   - Define baseline alarms for traffic spikes, 4xx/5xx anomalies, and throttles.
7. ~~Add max pagination bounds in generic query helpers.~~

### Near-term (1-4 weeks)

1. Implement GraphQL query depth/complexity limits and conservative defaults.
2. Add API Gateway throttling and usage limits; add websocket per-connection message rate limits.
3. ~~Redact sensitive GraphQL variables in logs and disable logging of auth payloads.~~
4. Disable Apollo landing page in production stages.
5. Add safety checks in `SecretsManagementStack` deploy path to fail if required secret inputs are blank.
6. Require auth and field minimization for sensitive user directory queries; add anti-enumeration constraints.
7. Add brute-force protections for login paths (IP/user throttling, temporary lockouts, and optional CAPTCHA).
8. ~~Add webapp security headers (CSP, HSTS, frame/referrer policies) with stage-aware tuning.~~

### Medium-term (1-3 months)

1. Add CI security gates: CodeQL, dependency scanning, IaC scanning (CDK synthesized templates).
2. Add WAF rules for API endpoints and alerting for auth failures/spikes.
3. Add environment protection rules and explicit manual approvals for higher stage promotion.
4. Define incident runbooks for token compromise, role compromise, and DNS hijack scenarios.

## Security Backlog (Implementation Candidates)

- ~~JWT claims hardening in `apps/api/lib/utils/auth.ts`.~~
- OIDC trust and policy hardening in `infrastructure/cdk/lib/stack/github-auth-stack.ts`.
- ~~CORS/domain allowlist controls in `apps/api/lib/graphql/apollo/lambdaHandler.ts`,
  `apps/api/lib/graphql/apollo/expressApolloServer.ts`, and `infrastructure/cdk/lib/stack/s3-bucket-stack.ts`.~~
- WebSocket auth transport hardening in `apps/api/lib/websocket/event.ts`, connect flow, and
  `apps/webapp/lib/utils/websocket.ts`.
- GraphQL abuse controls in `apps/api/lib/graphql/schema/index.ts` and server setup.
- L7 DDoS controls via WAF/rate rules for API and websocket public edges in
  `infrastructure/cdk/lib/stack/graphql-stack.ts` and `infrastructure/cdk/lib/stack/websocket-stack.ts`.
- User-directory exposure review and auth/privacy constraints in `apps/api/lib/graphql/resolvers/user.ts`.
- ~~Pagination hard limits in `apps/api/lib/utils/queries/query.ts`.~~
- ~~Webapp security header policy in `apps/webapp/next.config.mjs`.~~
- CI security workflow additions under `.github/workflows`.

## Risk Acceptance Guidance

No promotion to a new stage should proceed with unresolved Critical risks (`R-01`, `R-11`).

For High risks, promotion should require explicit temporary risk acceptance with a dated remediation owner and target
completion window.
