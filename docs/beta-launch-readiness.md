# Gatherle Beta Launch Readiness

Created: 2026-06-07

This document is the working launch-readiness checklist for the current mobile-first Gatherle beta.

It is intentionally focused on the crucial items only:

- controls that affect user trust
- controls that affect data safety or access boundaries
- controls that affect the core user journey
- controls that affect our ability to detect, debug, and roll back failures

For product context, use:

- `docs/product/GATHERLE_PRODUCT_MANUAL.md`
- `docs/project-brief.md`

For deeper security and observability implementation detail, use:

- `docs/security/abuse-controls-and-hardening.md`
- `docs/security/threat-model-risk-register.md`
- `docs/api/observability.md`
- `docs/runbooks/operational-alerts-and-rollback.md`

---

## Launch Context

This beta should be optimized for the journey:

`discovery -> event detail -> RSVP -> coordination -> re-entry`

Gatherle should be evaluated from a mobile-first perspective:

- the mobile app is a primary launch surface
- the mobile-sized webapp is the closest parity target
- desktop-only concerns should not drive launch decisions ahead of mobile experience quality

That means the most important surfaces are:

- `Home`
- `Explore`
- `Event Detail`
- `Messages`
- `Notifications`

Product laws that matter most for launch:

- Gatherle is a social-first event discovery product, not a generic listings app.
- RSVP is the primary action.
- Home should feel personal.
- Explore should feel broad.
- People-first social proof matters more than raw counts.

---

## How To Use This Doc

Every launch task should carry:

- an owner
- a due date
- a status
- evidence
- a launch decision

Suggested status values:

- `Open`
- `In Audit`
- `In Progress`
- `Ready`
- `Done`
- `Deferred`

Launch rule:

- No unresolved `P0` items at launch.
- `P1` items may ship only with explicit risk acceptance, an owner, and a dated follow-up.

---

## Executive Summary

| Priority | Workstream                                    | Current assessment                                                                                                                                  | Beta gate                                                                                                                     |
| -------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| P0       | Realtime stability                            | WebSocket callback bug is fixed in code but still requires redeploy and beta verification                                                           | Realtime messaging and in-app notifications must work without refresh                                                         |
| P0       | Authentication truthfulness and authorization | Auth flows are stronger than older docs suggest, but the supported matrix and object-level auth still need a release audit                          | We must be able to state exactly which auth methods are supported, and prove users cannot read or mutate data they do not own |
| P0       | Launch dataset quality                        | Seeding exists, but launch quality depends on curated Gauteng data, not just populated tables                                                       | Discovery must feel alive on day one                                                                                          |
| P0       | Critical smoke suite                          | Many pieces exist, but beta needs one reliable end-to-end smoke pass for core flows                                                                 | Sign up, login, browse, RSVP, follow, message, notify, logout must all pass                                                   |
| P0       | Trust, safety, and abuse controls             | Strong baseline exists for GraphQL and WebSocket, but some answers still need explicit verification rather than assumption                          | Validation, rate limiting, reset-link behavior, authz, and CORS posture must be clearly understood and tested                 |
| P0       | ~~Frontend failure handling~~                 | Completed on 2026-06-07. Mobile and web now have catch-all failure handling, shared screen states, and frontend error reporting                     | Done                                                                                                                          |
| P0       | Logging, alerts, and rollback                 | Logging exists. Alarm routing now has a real SNS path and rollback now has a concrete runbook; subscription confirmation and one drill still remain | We need to know how we detect breakage and how we recover fast                                                                |
| P1       | Performance and indexing audit                | Many indexes already exist, but beta should still validate top queries with real explain plans                                                      | Common discovery, RSVP, messages, and notifications queries must stay efficient                                               |
| P1       | Product-signaling polish                      | Important surfaces need launch-level clarity and confidence, not extra feature depth                                                                | Home, Explore, cards, and RSVP should clearly communicate value                                                               |
| P1       | Measurement and analytics                     | No clear product analytics instrumentation was found in the app surfaces                                                                            | We need onboarding and feature-usage tracking before launch traffic starts                                                    |

---

## 1. Current Prerequisite Blocker

### Realtime messaging and notifications

Why it matters:

- Messaging and in-app notifications are coordination infrastructure.
- If messages appear to stall or arrive only after refresh, beta trust collapses quickly.

Current state:

- The WebSocket callback path bug has already been identified and fixed in code.
- The issue was not client connect/auth failure; it was backend fan-out failure on the callback endpoint used by
  `postToConnection()`.

Required before beta:

- Redeploy the WebSocket fix.
- Run a beta smoke pass for:
  - `ping`
  - direct messaging
  - notification subscribe
  - follow/follow-request notifications
- Confirm:
  - sender pending state clears without refresh
  - recipient sees the message without refresh
  - notification badges and notification lists update live

Launch decision:

- `P0`

---

## 2. Authentication Truthfulness And Authorization

This section covers item 2 from the earlier launch list, with an updated assessment based on the current repo state.

### Why this matters

- Authentication truthfulness is about not shipping buttons, flows, or promises that behave differently from what the
  product claims.
- Authorization is about making sure a signed-in user can access only the resources they are allowed to access, and
  nothing more.

### Current state

Auth flow reality in the current repo:

- Webapp social sign-in UI exists in `apps/webapp/components/forms/auth/SocialAuthButtons.tsx`.
- The webapp now exchanges provider identity for a Gatherle session in `apps/webapp/auth.ts` and
  `apps/webapp/data/actions/global/auth/oauth.ts`.
- The API exposes `loginWithOAuth` in `apps/api/lib/graphql/resolvers/auth.ts`.
- Provider identity token verification is implemented in `apps/api/lib/utils/externalAuth.ts`.
- Mobile also calls `loginWithOAuth` from `apps/mobile/src/screens/auth/LoginProvidersScreen.tsx`.

Important nuance:

- Older roadmap notes in `docs/security/auth-architecture-and-provider-roadmap.md` are now partially stale relative to
  the codebase.
- This means the launch problem is no longer "social auth is missing."
- The launch problem is now "the supported auth matrix, docs, tests, and product copy must match what actually works."

Authorization posture in the current repo:

- Sensitive GraphQL resolvers broadly use `@Authorized(...)`.
- API auth claims are minimal and verified in `apps/api/lib/utils/auth.ts`.
- Ownership checks exist in the auth checker and resolver/service paths.
- Public-profile exposure has already been tightened, but the risk register still calls out residual public lookup risk
  and resolver-driven field redaction.

### Direct answer: are we sure authenticated users can only access what they are authorized to access?

Not enough to say "yes, fully proven" yet.

What we can say today:

- The repo has a serious authorization model, not a superficial one.
- Authentication and authorization are explicit in many important API paths.
- There is already evidence of object-level checks and ownership enforcement.

What we should not say yet:

- We should not claim complete certainty without a focused release audit of sensitive reads and writes.

Why:

- Authorization logic is partly centralized and partly resolver/service specific.
- Some public user reads intentionally still exist in reduced form.
- The safest beta stance is to treat authz as "strong but still requiring release-proof."

### Required before beta

- Define the supported auth matrix for the mobile-first beta:
  - email/password
  - Google
  - Apple
  - password reset
  - email verification
- Update any outdated docs that still describe auth as more incomplete than it is.
- Run a focused authorization audit on:
  - user profile reads
  - chat reads/writes
  - notification reads/updates
  - event edit/delete paths
  - organization membership and role changes
  - RSVP and save actions
  - follow/private-social visibility rules
- Add or confirm negative tests for "User A cannot read or mutate User B's data."
- Verify session-expiry behavior on web and mobile so expired sessions fail cleanly.

Launch decision:

- `P0`

---

## 3. Launch Dataset Quality

This section covers item 3 from the earlier launch list.

### Why this matters

- For Gatherle, empty discovery is a product failure even if the code is technically correct.
- A mobile-first Gauteng beta must answer "what is happening around me?" immediately.

### Current state

- Seed tooling and runbooks already exist in `docs/runbooks/api-seed.md`.
- Seed flows can populate catalog data, mock users, organizations, venues, events, follows, activity, and RSVPs.

### Required before beta

- Decide whether beta data is:
  - curated real launch content
  - high-quality synthetic launch content
  - a hybrid
- Seed and then manually QA:
  - event cards
  - event detail pages
  - venue names and neighborhoods
  - host/organizer identity
  - dates and recurrence correctness
  - images and social proof quality
  - map/geocode accuracy
- Bias the dataset toward Gauteng launch relevance, not generic coverage.
- Remove obviously fake or low-trust content from user-visible discovery surfaces.

What "good enough" looks like:

- Home feels personal and alive.
- Explore has breadth.
- Event cards quickly answer what, when, where, why care, and who is involved.

Launch decision:

- `P0`

---

## 4. Critical Smoke Suite

This section covers item 4 from the earlier launch list.

### Why this matters

- Beta should not depend on intuition.
- A small, trusted smoke suite is more important than broad but unreliable coverage.

### Required smoke flows

- sign up
- email verification
- login with email/password
- login with supported OAuth providers
- forgot password
- reset password
- browse Home and Explore
- open event detail
- RSVP
- save/bookmark
- follow user or organization
- send message
- receive in-app notification
- logout

### Required before beta

- Write down the exact smoke checklist and expected results.
- Make it runnable by a human and, where practical, by automated tests.
- Include one "expired session" and one "backend unavailable" scenario.
- Record the canonical beta accounts and test data needed for the pass.

Launch decision:

- `P0`

---

## 5. Trust, Safety, And Abuse Controls

This section covers item 5 from the earlier launch list and directly answers the main security questions.

### 5.1 Input validation and sanitization

Direct answer:

- Backend validation is in relatively good shape.
- We should not yet assume every user-controlled field on every surface has been fully audited end to end.

Current state:

- Backend validation is centered on Zod schemas under `apps/api/lib/validation/zod`.
- WebSocket payloads are schema validated.
- Common auth flows on web and mobile also use schema validation.
- No obvious broad unsafe HTML rendering pattern was found in the webapp or mobile app.

Important nuance:

- Validation and sanitization are not the same thing.
- Validation says "is this input allowed?"
- Sanitization says "if this value is rendered or logged, can it become unsafe?"

Required before beta:

- Inventory all user-controlled inputs:
  - auth fields
  - profile fields
  - event title/summary/description
  - venue fields
  - organization fields
  - chat messages
  - moment captions
  - comment-like text fields
- Confirm every server write path has backend schema validation.
- Audit all user-generated text rendering paths to make sure we are not introducing XSS through rich text, HTML-like
  content, or unsafe link handling.
- Add negative tests for malformed payloads, oversize payloads, and unexpected enum/value combinations.

Launch decision:

- `P0`

### 5.2 CORS policy

Direct answer:

- The API CORS policy is explicitly allowlisted, not wildcard.
- But CORS is not an access-control boundary.
- The correct answer to "will only requests from our domain be serviced by our API?" is "no, not in the strict sense."

Current state:

- CORS allowlists are built from stage defaults plus explicit configured overrides.
- Wildcard `*` is explicitly rejected.
- Beta defaults include Gatherle beta web origins and local development origins.
- Disallowed browser preflights are rejected.

Important nuance:

- CORS controls browser behavior.
- It does not stop server-to-server traffic, `curl`, Postman, or malicious non-browser clients.
- Real protection still depends on auth, authz, WAF, throttling, and application validation.

Required before beta:

- Decide whether beta should keep localhost origins enabled in the deployed beta stage.
- Verify `CORS_ALLOWED_ORIGINS` is set intentionally, not casually.
- Confirm the same strictness on S3/media upload flows where relevant.
- Make sure the team does not treat CORS as an authorization feature.

Launch decision:

- `P0`

### 5.3 Rate limiting for GraphQL and WebSocket

Direct answer:

- We do have meaningful rate limiting and abuse controls.
- We should still verify that the highest-risk paths are covered at the right level.

Current state:

- GraphQL has stage throttling and WAF rate-based blocking.
- GraphQL also has query depth and complexity guards.
- WebSocket has stage throttling plus route-level quotas for:
  - `connect`
  - `notification.subscribe`
  - `chat.send`
  - `chat.read`
  - `ping`

Important nuance:

- Not every GraphQL operation has its own semantic per-user rate limit.
- WebSocket still lacks a WAF-equivalent distributed-abuse layer.
- Rate limiting must be evaluated against actual product abuse cases, not just request count.

Required before beta:

- Confirm thresholds are appropriate for real beta usage and not just local testing.
- Review hot paths for abuse exposure:
  - login
  - password reset
  - follow/unfollow
  - RSVP toggling
  - event creation/edit if exposed in beta
  - chat send/read
  - notification subscribe
- Verify rate-limit responses degrade cleanly on the clients.
- Add at least one release check that intentionally triggers throttling and confirms the system behaves as expected.

Launch decision:

- `P0`

### 5.4 Password reset links

Direct answer:

- Yes, password reset links currently expire.
- The current expiry is 1 hour, which is reasonable for beta.

Current state:

- Password reset token expiry is implemented in `apps/api/lib/mongodb/dao/passwordResetToken.ts`.
- TTL cleanup exists for reset tokens.
- The webapp copy already tells users the link expires in 1 hour.

Required before beta:

- Verify links are:
  - actually expiring
  - single-use in practice
  - invalid after successful reset
  - safely generic when the email is not registered
- Verify reset errors do not leak sensitive internal details.

Launch decision:

- `P0`

---

## 6. Frontend Failure Handling

This section answers the frontend error-handling question directly.

Status:

- `Done` on `2026-06-07`

### Direct answer

- This workstream is now addressed for the beta launch surface.
- Web and mobile both have catch-all failure handling.
- Core surfaces now share explicit UX for session expiry, offline/network failure, backend outage, and unexpected query
  failure.

### Current state

Webapp:

- `apps/webapp/app/error.tsx` provides a top-level unexpected-error screen.
- `apps/webapp/app/global-error.tsx` now provides a root-level catch-all for layout/app-shell failures.
- `apps/webapp/app/not-found.tsx` provides a dedicated not-found screen.
- `apps/webapp/components/errors/ErrorPage.tsx` gives a reusable user-facing error shell.
- `apps/webapp/components/errors/QueryErrorState.tsx` now standardizes screen-level error states.
- `apps/webapp/components/errors/GlobalClientErrorReporter.tsx` and Apollo error links now capture unexpected client and
  data-layer failures.

Mobile:

- `apps/mobile/src/components/core/AppErrorBoundary.tsx` and `AppCrashScreen.tsx` now provide an app-wide catch-all
  crash path.
- `apps/mobile/src/components/core/ScreenErrorState.tsx` now standardizes screen-level failure handling.
- `apps/mobile/src/hooks/core/useSessionExpiryRedirect.ts` now centralizes expired-session handling on core surfaces.
- `apps/mobile/src/components/core/MobileRuntimeErrorReporter.tsx` and Apollo error links now report unexpected runtime
  and data-layer failures.

Important nuance:

- Friendly inline errors are not the same as global crash handling.
- We need both:
  - specific UX for known failures
  - a catch-all for unknown failures

### Required before beta

- ~~Confirm users never see raw stack traces in web or mobile.~~
- ~~Add or confirm app-wide catch-all behavior for mobile.~~
- ~~Define UI for:~~
  - ~~404/not found~~
  - ~~generic unexpected error~~
  - ~~network/offline~~
  - ~~session expired / sign-in required~~
  - ~~temporary backend outage~~
- ~~Add crash/error reporting so unhandled frontend failures are visible to engineers, not just users.~~

Completed evidence:

- Mobile crash boundary and crash screen were added.
- Web root-level global error handling was added.
- Shared failure classifiers and reusable error-state components were added for both frontends.
- Core mobile-first surfaces were wired into the shared failure states.
- Global frontend runtime/Apollo reporting was added on both surfaces.

Launch decision:

- `P0` - Done

---

## 7. Performance And Indexing

This section answers the database-indexing question directly.

### Direct answer

- Many important indexes already exist.
- We should still run a launch-specific indexing audit on the most common beta reads and writes.

### Current state

There is already indexing on several core models, including:

- users
- follows
- organization memberships
- notifications
- event occurrences and participants
- chat messages and unread state
- websocket connection and throttle records
- password reset and other TTL-backed token/state records

### Why this still needs work

- Having indexes is not the same as having the right indexes for current query shapes.
- Beta traffic patterns usually reveal a small number of hot reads very quickly.

### Required before beta

- Run `explain()` reviews for the main beta query patterns:
  - Home/feed
  - Explore/discovery
  - event detail
  - RSVP status and attendee reads
  - notifications list and unread count
  - conversation list
  - thread messages
- Confirm there are no accidental collection scans on hot paths.
- Check sort-order alignment for cursor and newest-first reads.
- Record any missing indexes as explicit launch decisions instead of vague follow-ups.

Launch decision:

- `P1`, but becomes `P0` if explain-plan review finds hot-path scans

---

## 8. Logging, Alerts, And Operational Debuggability

This section answers the logging and alerts questions directly.

### 8.1 Logging

Direct answer:

- Yes, there is meaningful structured logging in the API and WebSocket layers.
- The remaining question is whether it is complete enough, redacted enough, and easy enough to use under incident
  pressure.

Current state:

- Centralized logging exists.
- Request correlation exists.
- GraphQL logging avoids raw variable-value dumping.
- WebSocket logging is already rich enough to diagnose route-level failures.

Required before beta:

- Verify the key production logs needed for launch incidents:
  - auth failures
  - websocket delivery failures
  - GraphQL query-guard rejections
  - throttles
  - unexpected resolver failures
  - email delivery failures
- Verify sensitive values are redacted.
- Document the top Logs Insights queries the team will use during beta.

Launch decision:

- `P0`

### 8.2 Alerts

Direct answer:

- The repo contains CloudWatch dashboards and alarms for GraphQL and WebSocket.
- Alarm routing is now implemented in the repo via the monitoring stack SNS topic.
- What is still not fully proven is recipient confirmation and live notification rehearsal in the target environment.

Current state:

- GraphQL monitoring dashboards and alarms exist.
- WebSocket monitoring dashboards and alarms exist.
- Alarm coverage includes errors, throttles, spike conditions, and abuse-related signals.
- `MonitoringDashboardStack` now creates a stage-scoped SNS topic for operational alerts.
- Current monitoring alarms publish to that topic on `ALARM` state transitions.
- Optional email subscriptions are configured through `ALERT_EMAIL_RECIPIENTS`.

Required before beta:

- Confirm the recipients in `ALERT_EMAIL_RECIPIENTS`.
- Confirm every SNS email subscription from the inbox.
- Record alert ownership by name.
- Test at least one real notification path before launch.
- Reduce low-value noise so urgent alerts are still trusted during beta.
- Use `docs/runbooks/operational-alerts-and-rollback.md` as the operating runbook.

Launch decision:

- `P0`

---

## 9. Rollout, Rollback, And Blue/Green

This section answers the rollback question directly.

### Direct answer

- We should have a rollback plan before beta.
- We do not necessarily need full blue/green deployment before this beta.
- The repo now has a concrete rollback runbook aligned to the current deploy model.

### What blue/green means

Blue/green means:

- two parallel production-like environments
- traffic switches from one to the other
- rollback is mostly a traffic flip, not a rebuild

Why people like it:

- safer releases
- faster rollback
- lower downtime risk

Why it is not automatically required for this beta:

- it increases infrastructure and operational complexity
- it is only valuable if the team is actually prepared to operate it well

### Recommended beta stance

For this beta, the critical requirement is not "full blue/green." The critical requirement is "fast, documented,
rehearsed rollback."

Required before beta:

- Confirm the owners and expected recovery times in `docs/runbooks/operational-alerts-and-rollback.md`.
- Define:
  - who can trigger rollback
  - what evidence triggers rollback
  - where the previous known-good version comes from
  - expected recovery time
- Rehearse one rollback before launch if possible.

Practical expectations:

- Backend rollback may be a redeploy of the previous known-good revision or stack configuration.
- Mobile rollback may be a phased-rollout halt, OTA/config rollback, kill switch, or store-release mitigation depending
  on the release path.
- Webapp rollback should use the hosting platform's previous deployment promotion/aliasing flow.

Launch decision:

- `P0`

---

## 10. Product-Signaling Surface Polish

This section covers item 6 from the earlier launch list.

### Why this matters

- Beta users decide whether the product is alive, trustworthy, and useful in the first few screens.
- Polish should go where it changes belief, not where it just changes aesthetics.

### Required before beta

- Prioritize polish on:
  - Home
  - Explore
  - event cards
  - event detail
  - RSVP prominence
- Make sure:
  - Home feels personal, not generic
  - Explore feels broad and discovery-first
  - cards show people and momentum, not just metadata
  - RSVP visually outranks secondary actions

Do not spend beta time on:

- low-traffic corners
- advanced messaging features
- richer notification sophistication
- polish that does not improve discovery or commitment

Launch decision:

- `P1`

---

## 11. Measurement And Tracking

This section answers the analytics and feature-usage questions directly.

### Direct answer

- No clear product analytics implementation was found in the current app surfaces.
- We should treat analytics as a launch requirement, not a post-beta nice-to-have.

### Why this matters

Without measurement, beta feedback becomes anecdotal. We need to know:

- who started onboarding
- who finished onboarding
- where users dropped off
- whether core product actions are actually being used

### Minimum beta tracking we should have

#### Onboarding funnel

- `onboarding_started`
- `onboarding_step_viewed`
- `onboarding_step_completed`
- `onboarding_completed`
- `onboarding_abandoned` or inferred drop-off by timeout/session-end

Each event should carry enough context to segment by:

- platform
- surface
- step name
- auth method
- stage/environment

#### Auth funnel

- `signup_started`
- `signup_succeeded`
- `login_started`
- `login_succeeded`
- `login_failed`
- `password_reset_requested`
- `password_reset_completed`
- `oauth_selected`
- `oauth_succeeded`
- `oauth_failed`

#### Core product usage

- `event_card_opened`
- `event_detail_viewed`
- `rsvp_started`
- `rsvp_completed`
- `event_saved`
- `share_opened`
- `follow_started`
- `follow_completed`
- `message_sent`
- `notification_opened`

### Analytics implementation guidance

- Pick one analytics system and use it consistently.
- Use stable event names and a short event taxonomy document.
- Do not log raw message bodies, sensitive token values, or unnecessary PII as analytics payloads.
- Tie analytics IDs cleanly to authenticated user IDs where privacy policy allows, and otherwise to anonymous/session
  IDs.

### Required before beta

- Decide the analytics tool.
- Write the first event taxonomy.
- Instrument the onboarding funnel and the core RSVP/discovery/follow/message events.
- Build at least two dashboards:
  - onboarding funnel
  - core feature usage

Launch decision:

- `P1`, but strongly recommended before launch

---

## 12. Explicit Non-Blockers For This Beta

These should not be allowed to distract the launch unless scope changes:

- desktop-only issues that do not affect the mobile app or mobile-sized webapp
- advanced notification batching/digests
- presence indicators
- typing indicators
- richer social features that do not improve discovery, RSVP, or coordination

Important clarification:

- mobile-only bugs on core surfaces are not automatically non-blockers for this beta
- if a bug breaks the mobile app experience on Home, Explore, Event Detail, Messages, Notifications, or RSVP flow, it
  should be treated as launch-critical

---

## 13. Recommended Go/No-Go Criteria

Beta should not launch until all of the following are true:

- realtime messaging and notifications are verified in beta after redeploy
- the supported auth matrix is documented and working
- the authorization audit is complete for sensitive beta paths
- the launch dataset is populated and manually QA'd
- the core smoke suite passes
- validation, rate limiting, and password-reset behavior are verified
- ~~users cannot see raw stack traces~~
- alerts notify real humans
- rollback steps are written down and understood

If we launch without analytics, that should be an explicit decision, not an accident.

---

## 14. First Pass Ownership Template

For each open task, record:

- `Owner:`
- `Priority:`
- `Status:`
- `Evidence:`
- `Target date:`
- `Launch decision:`
- `Notes:`

This document should be updated as evidence changes. It is not a one-time planning note.
