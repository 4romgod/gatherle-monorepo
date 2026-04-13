# Gatherle Authentication and Authorization Architecture

## Purpose

This document describes:

- the current authentication (`authN`) and authorization (`authZ`) model across the Gatherle webapp and API
- the gaps and risks in the current implementation
- the desired end state for first-party and social login
- the recommended identity providers for a social-first event platform like Gatherle
- a practical migration plan from the current state to the desired state

This document is repo-specific. It reflects the implementation in:

- `apps/webapp/auth.ts`
- `apps/webapp/auth.config.ts`
- `apps/webapp/proxy.ts`
- `apps/webapp/lib/utils/auth.ts`
- `apps/api/lib/utils/auth.ts`
- `apps/api/lib/graphql/apollo/expressApolloServer.ts`
- `apps/api/lib/graphql/apollo/lambdaHandler.ts`
- `apps/api/lib/graphql/resolvers/user.ts`
- `apps/api/lib/graphql/resolvers/auth.ts`
- `apps/api/lib/websocket/routes/connect.ts`
- `apps/api/lib/mongodb/dao/user.ts`
- `apps/api/lib/mongodb/models/user.ts`
- `packages/commons/lib/types/user.ts`

---

## Product Context

Gatherle is not a generic SaaS admin console. It is a consumer and community-facing event platform with:

- user profiles
- event discovery
- organizations
- follows and social graph behavior
- personalized feeds
- RSVPs and attendance
- realtime chat and notifications

That matters because identity is not only about logging in. Identity drives:

- profile ownership
- content ownership
- personalized feeds
- social visibility
- organization membership
- moderation and admin controls
- realtime connection identity

For this product, the system needs two distinct capabilities:

1. **Identity proofing** This is where Google, Apple, email/password, or other providers prove who the person is.

2. **Application authorization** This is where Gatherle decides what that person can do inside the product.

Those two concerns should stay separate.

---

## Current State

## Current Architecture Summary

Today, the effective authentication architecture is:

- the **API is the system of record for application identity**
- the **API issues Gatherle JWTs**
- the **API verifies Gatherle JWTs**
- the **webapp stores the Gatherle JWT inside the NextAuth session**
- the **webapp forwards the Gatherle JWT to GraphQL and WebSocket requests**
- the **API uses JWT claims plus resolver rules to authorize access**

So although the webapp uses NextAuth, the current trust boundary still centers on the API JWT, not on an external OAuth
provider token.

## Current Backend Authentication

### API-issued JWTs

The backend signs its own JWTs in `apps/api/lib/utils/auth.ts`.

Key characteristics:

- algorithm: `HS256`
- secret: `JWT_SECRET`
- default expiry: `7d`
- versioned token claims via `ver`
- minimal claims only, not full user objects

Current normalized Gatherle auth claims:

- `sub` -> `userId`
- `email`
- `username`
- `userRole`
- `isTestUser` (optional)
- `ver`

This is a good direction. The API no longer depends on provider-specific claims to authorize application behavior.

### How the API authenticates requests

The API reads `Authorization: Bearer <token>` in both dev and deployed paths:

- `apps/api/lib/graphql/apollo/expressApolloServer.ts`
- `apps/api/lib/graphql/apollo/lambdaHandler.ts`

It then calls `verifyToken(...)` from `apps/api/lib/utils/auth.ts`.

If the token is valid:

- `context.token` is populated
- `context.user` is populated with normalized `AuthClaims`

If the token is invalid:

- public operations can still proceed without an authenticated user
- protected operations fail later through `@Authorized(...)` and `authChecker`

### Current first-party login and signup

Current first-party auth flow is email/password based:

- `createUser` mutation in `apps/api/lib/graphql/resolvers/user.ts`
- `loginUser` mutation in `apps/api/lib/graphql/resolvers/user.ts`
- user persistence and password verification in `apps/api/lib/mongodb/dao/user.ts`
- password hashing in `apps/api/lib/mongodb/models/user.ts`

Additional auth-related backend features already exist:

- email verification
- forgot password
- reset password

These live in `apps/api/lib/graphql/resolvers/auth.ts`.

### Current WebSocket authentication

Realtime connections are authenticated separately in `apps/api/lib/websocket/routes/connect.ts`.

The socket handshake accepts:

- `Authorization` header
- `Sec-WebSocket-Protocol` with `gatherle.jwt.<token>`

It verifies the same Gatherle JWT via `verifyToken(...)` and ties the connection to the authenticated `userId`.

This is good because realtime identity is consistent with GraphQL identity.

## Current Backend Authorization

Authorization in the API is primarily enforced with:

- `@Authorized([roles...])`
- `authChecker(...)` in `apps/api/lib/utils/auth.ts`
- ownership checks for sensitive operations

The role model currently includes:

- `Admin`
- `Host`
- `User`

`authChecker(...)` performs:

- authentication presence check
- role membership check
- operation-level ownership enforcement for sensitive mutations and reads

Examples of protected domains:

- user mutations
- event create/update/delete
- organization management
- organization membership changes
- venue mutations
- event participation mutations

Admin-only paths also exist for parts of taxonomy and admin functionality.

### Important nuance: route protection is not the same as authorization

Frontend route protection is implemented in `apps/webapp/proxy.ts` and `apps/webapp/routes.ts`.

This protects web pages such as:

- account routes
- admin routes
- venue creation routes

But this is only a UX and access-routing layer. It is not the real authorization boundary. The real authorization
boundary is the API resolver layer.

That separation is correct and should remain.

## Current Frontend Authentication

### NextAuth is present, but mostly as a session container around the API JWT

The webapp uses NextAuth in:

- `apps/webapp/auth.ts`
- `apps/webapp/auth.config.ts`
- `apps/webapp/types/next-auth.d.ts`

Current behavior:

- NextAuth uses `session: { strategy: 'jwt' }`
- the Credentials provider calls `loginUserGlobalAction(...)`
- `loginUserGlobalAction(...)` calls the API `loginUser` mutation
- the API returns `UserWithToken`
- NextAuth stores that returned object into its JWT/session
- the session then exposes `session.user.token`

This means the webapp session is effectively carrying an API-issued Gatherle JWT.

### Frontend request behavior

The webapp uses `getAuthHeader(...)` in `apps/webapp/lib/utils/auth.ts` to attach:

- `Authorization: Bearer <gatherle-jwt>`

This pattern is already used widely across:

- client hooks
- server actions
- page loaders
- realtime utilities

That is important because it means a future OAuth rollout should preserve `session.user.token` as the token the API
trusts.

### Current session validation in the webapp

`apps/webapp/auth.ts` validates the stored token with `isAuthenticated(...)` from `apps/webapp/lib/utils/auth.ts`.

Right now that utility:

- decodes the JWT
- checks the `exp` timestamp
- does not cryptographically verify the signature

This is acceptable only because:

- the webapp is not the trust boundary
- the API still performs real verification

But it means the webapp-side token check is a convenience check, not a security check.

## Current OAuth/Social Login State

The webapp already includes social-provider-related pieces:

- `GoogleProvider` in `apps/webapp/auth.config.ts`
- `GitHubProvider` in `apps/webapp/auth.config.ts`
- Google/Facebook-looking buttons in the login and register UI

However, the end-to-end social auth flow is not implemented as a Gatherle auth flow yet.

Specifically, what is missing today:

- no backend mutation or endpoint that exchanges a provider identity for a Gatherle JWT
- no provider identity linkage model on the Gatherle `User`
- no account-linking strategy
- no provider-specific onboarding flow
- no evidence that the Google button currently completes a Gatherle sign-in flow

So the project is currently **credentials-first with partial social-login scaffolding**, not a true multi-provider
identity system.

---

## Current-State Strengths

- The API is already the source of truth for authorization.
- JWT claims are minimal and versioned.
- GraphQL authorization is centralized and explicit.
- Ownership checks already exist for many high-risk operations.
- WebSocket auth reuses the same application identity model.
- `NEXTAUTH_SECRET` and `JWT_SECRET` are already separated.
- The webapp session shape already carries `user + token`, which is a good bridge model.

---

## Current-State Weaknesses and Gaps

## Identity Gaps

- The `User` model is still oriented around password-based accounts.
- There is no durable provider identity model such as `google.sub`, `apple.sub`, or `facebook.id`.
- There is no canonical account-linking policy.
- There is no explicit distinction between:
  - authentication method
  - account recovery method
  - primary contact email

## UX/Product Gaps

- Social login buttons exist in the UI but are not yet described by a complete backend flow.
- Registration appears separate from session creation.
- There is no documented “first social login” onboarding flow for required missing fields such as username, birthdate,
  or profile preferences.

## Security/Operational Gaps

- Brute-force protection for email/password login is not evident in the current login path.
- Some user lookup/read paths are still public and were already called out in
  `docs/security/threat-model-risk-register.md`.
- WebSocket auth still depends on bearer-style token transport during handshake rather than short-lived connection
  tickets.
- There is not yet a provider-token exchange boundary on the API.

---

## Why OAuth Changes the Architecture

Adding Google OAuth does **not** mean the frontend should start sending Google tokens directly to every Gatherle API
request.

That would be the wrong fit for this codebase because:

- your API authorization rules are based on Gatherle roles and ownership
- your API expects Gatherle claim names and token versioning
- your app has domain-specific identity data that Google does not own
- your WebSocket layer already expects Gatherle JWTs

OAuth providers should prove identity at login time. After that, Gatherle should still mint and enforce its own
application token.

---

## Desired State

## Target Architecture Summary

The target model should be:

- **NextAuth acts as the frontend identity broker**
- **OAuth providers authenticate the human**
- **the API maps external identity to a Gatherle user**
- **the API mints the Gatherle JWT**
- **the webapp stores the Gatherle JWT in the NextAuth session**
- **all GraphQL and WebSocket requests continue to use the Gatherle JWT**

This keeps the current API authorization model intact while allowing multiple sign-in methods.

## Recommended Trust Model

### Responsibility split

**Frontend / NextAuth**

- starts login with Google, Apple, email magic link, or credentials
- receives provider callback
- passes provider proof to the API for exchange
- stores Gatherle user + Gatherle JWT in session
- refreshes session when account data changes

**Backend / API**

- verifies external provider proof
- finds or creates the corresponding Gatherle user
- links provider identity to the user
- issues Gatherle JWT
- continues enforcing app authorization rules

### Core rule

External provider tokens are for **login exchange**, not for ongoing API authorization.

---

## Target End-to-End Flows

## A. Credentials login

This remains supported.

```text
Browser -> NextAuth Credentials -> API loginUser -> API verifies password
-> API issues Gatherle JWT -> NextAuth stores Gatherle session -> FE uses Bearer Gatherle JWT
```

## B. Google login

Recommended flow:

```text
Browser -> NextAuth Google -> Google authenticates user
-> NextAuth receives Google identity proof
-> Webapp calls API exchangeGoogleIdentity
-> API verifies Google proof
-> API finds or creates Gatherle user
-> API issues Gatherle JWT
-> NextAuth stores Gatherle session -> FE uses Bearer Gatherle JWT
```

## C. Apple login

Same pattern as Google, but account-linking rules must handle:

- Apple private relay emails
- inconsistent email return behavior after first consent

## D. Realtime/WebSocket

No major conceptual change:

- the client still uses the Gatherle JWT
- the WebSocket connect route still authenticates Gatherle application identity

Only the source of that Gatherle JWT changes for social users.

---

## Recommended Provider Portfolio

This section lists the providers that fit Gatherle best as a social-first event platform.

## Tier 1: Should Have

### 1. Email and password

Keep it.

Why:

- universal fallback
- works for every user regardless of social account ownership
- important for support, recovery, and users who do not want social login
- already implemented

### 2. Google

Highest-priority social provider.

Why:

- broad consumer adoption
- low-friction onboarding
- strong identity quality
- common on Android and Chrome-heavy audiences
- good fit for consumer event discovery products

### 3. Apple

High-priority if iOS is or will be important.

Why:

- required in practice if you later ship native iOS and offer third-party social login
- strong consumer trust and privacy posture
- common for premium mobile audiences

## Tier 2: Strongly Consider

### 4. Facebook

Useful for this category of product, but with caution.

Why it fits:

- events and community behavior overlap strongly with Facebook’s legacy social/event use cases
- a meaningful portion of organizers and users may still expect it

Why caution is needed:

- Meta app review and permissions can be tedious
- product dependency risk is higher
- Facebook identity quality is fine, but the developer experience is less pleasant than Google/Apple

Recommendation:

- include only after Google and Apple are stable

### 5. Email magic link

Strongly recommended even if credentials remain.

Why:

- lower friction than passwords
- useful for infrequent users discovering an event from a shared link
- reduces password-reset burden
- works well for consumer products with occasional rather than daily usage

This can sit alongside credentials rather than replacing them.

### 6. Phone number / OTP

Worth considering, especially for growth and trust-sensitive interactions.

Why:

- fast mobile onboarding
- useful for organizer verification, anti-abuse, and urgent event communication
- fits markets where phone identity is more natural than email identity

Why it is not Tier 1:

- higher operational cost
- fraud/abuse controls needed
- more complexity around number recycling and recovery flows

## Tier 3: Optional / Contextual

### 7. Instagram

Only if there is a clear creator/influencer/community strategy.

Useful for:

- creator-led discovery
- social proof
- content-linked event promotion

Not a core auth priority on its own.

### 8. X / Twitter

Not recommended as an early priority.

Reasons:

- weaker fit for mainstream consumer onboarding
- unstable platform considerations
- lower value relative to implementation and policy overhead

### 9. LinkedIn

Usually low priority for Gatherle’s current product shape.

Useful only if:

- you pivot toward professional networking events
- you have B2B organizer workflows where work identity matters

### 10. GitHub

Not recommended as a core end-user provider for Gatherle.

Even though `GitHubProvider` is present in `apps/webapp/auth.config.ts`, it is not a strong product fit for a general
consumer event platform. It would only make sense if:

- the audience becomes strongly tech-community oriented
- Gatherle hosts many developer meetups or hackathon-centric flows

## Recommended final provider set

For this product, the best medium-term mix is:

1. Email/password
2. Google
3. Apple
4. Email magic link
5. Facebook
6. Phone OTP

If scope must be reduced, the first rollout should be:

1. Email/password
2. Google
3. Apple

---

## Recommended Data Model Changes

## Problem

The current `User` model is centered on direct credentials and profile data. That is not enough for a multi-provider
identity system.

## Recommended model

Add a provider identity model to the Gatherle user.

Two workable designs:

### Option A: embedded identities on `User`

Example shape:

```ts
type AuthProvider = 'credentials' | 'google' | 'apple' | 'facebook' | 'email_magic_link' | 'phone';

type AuthIdentity = {
  provider: AuthProvider;
  providerUserId: string;
  providerEmail?: string;
  emailVerifiedByProvider?: boolean;
  linkedAt: Date;
  lastLoginAt?: Date;
};
```

Pros:

- simple
- easy to fetch with the user
- good fit if one user usually has a small number of linked identities

### Option B: separate `UserIdentity` collection

Pros:

- stronger uniqueness guarantees and indexing flexibility
- cleaner if identity operations become more complex

Cons:

- more moving parts

### Recommendation

Start with **embedded identities on `User`** unless you already expect complex identity linking, enterprise auth, or
many provider types soon.

## Other user/auth fields to add

- `authMethods[]`
- `primaryAuthMethod`
- `lastLoginAt`
- `accountStatus`
- `providerProfilePicture` or a strategy for trusted provider avatars
- `emailVerifiedAt`
- optional `phoneVerifiedAt`

## Important account-linking rules

Do not rely on email alone forever.

Recommended linking policy:

- provider identity is authoritative by `provider + providerUserId`
- verified email can be used for first-link heuristics
- linking a new provider to an existing user should require a safe decision path
- account takeover risks must be considered when emails match but provider identity is new

---

## Recommended API Changes

## New backend capability: external identity exchange

Add explicit backend operations for external auth exchange, for example:

- `loginWithGoogle(input)`
- `loginWithApple(input)`
- `loginWithFacebook(input)`
- or a generic `exchangeExternalIdentity(input)`

Recommended generic input:

```ts
type ExchangeExternalIdentityInput = {
  provider: 'google' | 'apple' | 'facebook';
  idToken?: string;
  accessToken?: string;
  authorizationCode?: string;
};
```

Recommended backend behavior:

1. Validate input.
2. Verify the provider proof against the provider’s rules.
3. Extract stable provider subject identifier.
4. Find existing Gatherle user by linked provider identity.
5. If not found, decide whether to:
   - create a new Gatherle user
   - link to an existing Gatherle user by verified email
   - stop and require explicit linking/confirmation
6. Ensure required Gatherle profile fields exist.
7. Mint Gatherle JWT with existing `generateToken(...)`.
8. Return `UserWithToken`.

## User creation policy for first social login

When a provider login creates a new account:

- generate a safe default username if needed
- mark email verification according to provider trust rules
- collect missing required profile fields in a post-login onboarding flow

For this repo, fields that may still need completion include:

- `username`
- `birthdate`
- possibly profile preferences or visibility defaults

## Keep API-issued JWTs

Do not replace `generateToken(...)` or `verifyToken(...)` with provider-specific token validation for normal API
traffic.

Keep this invariant:

- only Gatherle JWTs authorize Gatherle API requests

---

## Recommended Webapp / NextAuth Changes

## Desired NextAuth role

NextAuth should become the frontend session orchestrator for multiple sign-in methods, but not the long-term authority
for API authorization.

## Required changes

### 1. Social sign-in buttons must actually call providers

Current UI buttons in:

- `apps/webapp/app/auth/login/page.tsx`
- `apps/webapp/components/forms/auth/Register.tsx`

look like social login entry points, but the architecture should ensure they call real provider flows and not remain
decorative placeholders.

### 2. Provider callback must exchange into Gatherle identity

After successful Google or Apple authentication, the NextAuth callback should:

- obtain provider proof
- call the Gatherle API exchange mutation
- replace the temporary provider-oriented session state with the returned `UserWithToken`

### 3. Session shape should stay stable

The current FE depends on:

- `session.user.userId`
- `session.user.userRole`
- `session.user.token`

Preserve this shape.

That minimizes downstream UI changes because existing hooks, server actions, Apollo requests, and realtime utilities
already depend on it.

### 4. Add social onboarding flow

A first social login may not provide everything Gatherle needs.

Add an onboarding checkpoint for missing fields such as:

- username
- birthdate
- interests
- profile personalization

Users should not be blocked from establishing a session, but they may be blocked from certain product features until
required fields are completed.

---

## Authorization in the Desired State

The desired state for authorization is mostly continuity, not replacement.

## What should stay the same

- `@Authorized([roles])`
- `authChecker(...)`
- ownership enforcement
- resolver/service-level authorization checks
- WebSocket authorization using Gatherle identity

## What should improve

### 1. Separate authentication provider from role assignment

A user who signs in with Google is not a different authorization class than a user who signs in with password.

Roles should continue to come from Gatherle domain rules:

- `Admin`
- `Host`
- `User`

### 2. Keep provider-neutral app claims

Do not add provider-specific authorization logic to the JWT claim contract unless there is a real business need.

The JWT should continue to express:

- who the Gatherle user is
- what Gatherle role they have

It should not become a mirror of provider metadata.

### 3. Strengthen public-read policy

The threat model already notes that some user reads are public enough to enable discovery/enumeration risk.

As part of auth redesign, review:

- public user queries
- user directory exposure
- field minimization for anonymous traffic

---

## Security Requirements for the Desired State

## Authentication hardening

- add brute-force controls for credentials login
- log auth events without leaking secrets or provider tokens
- ensure provider proof is validated server-side, not trusted from the browser
- maintain separate secrets for:
  - NextAuth session protection
  - API JWT signing

## Account-linking hardening

- require careful email-linking logic
- prevent silent takeover via matched emails alone
- record provider link/unlink events
- support secure reauthentication for sensitive account-linking changes

## Session and token strategy

- keep Gatherle JWT short enough to reduce replay risk
- decide whether to introduce refresh semantics later
- consider shorter-lived websocket connection tickets in the future

## Auditing and observability

Track at minimum:

- sign-in success/failure by method
- first login vs returning login
- provider link/unlink events
- suspicious repeated login failures
- auth exchange failures

---

## Migration Plan

## Phase 0: Decide the contract

Before coding:

- confirm the target provider list for phase 1
- confirm whether account creation on first social login is automatic
- confirm required profile fields for “account complete”
- confirm whether verified provider email can auto-link existing accounts

## Phase 1: Data model preparation

Backend changes:

- add provider identity fields to `User` or create `UserIdentity`
- add indexes/uniqueness strategy
- add migration logic for existing password users

No user-facing behavior changes yet.

## Phase 2: Add provider exchange endpoints

Backend changes:

- implement `exchangeExternalIdentity` or provider-specific mutations
- verify Google tokens server-side
- return existing `UserWithToken`

At this point, the API becomes capable of turning external identity into Gatherle identity.

## Phase 3: Wire NextAuth provider callbacks

Frontend changes:

- update NextAuth callbacks so Google sign-in calls the API exchange mutation
- persist returned Gatherle user + Gatherle JWT into the NextAuth session
- keep `session.user.token` stable

This is the key integration phase.

## Phase 4: Ship Google first

Recommended first rollout:

- Google only
- credentials remain fully supported
- social onboarding flow for missing profile fields

Why:

- lowest complexity-to-value ratio
- easy to validate end-to-end
- highest likely consumer adoption

## Phase 5: Add Apple

After Google is stable:

- implement Apple exchange flow
- handle relay email and linking rules explicitly

## Phase 6: Add magic link and/or Facebook

Choose based on growth needs and product direction.

## Phase 7: Security and policy hardening

- add login throttling
- review public user query exposure
- improve audit coverage
- revisit websocket auth transport hardening

---

## Testing Strategy

## Backend tests

Add unit/e2e coverage for:

- provider exchange success
- invalid provider proof rejection
- existing linked-user login
- first-time provider signup
- email-based account linking rules
- duplicate-link prevention
- JWT contents after provider login
- resolver authorization continuity

## Frontend tests

Add tests for:

- Google sign-in button behavior
- successful session population after provider login
- protected route behavior after provider login
- onboarding flow when required fields are missing
- session refresh after profile edits

## Realtime tests

Confirm that users authenticated via Google can:

- establish websocket connections
- receive notifications
- use chat/realtime features

without any websocket-specific provider logic.

---

## Recommended Decision

For Gatherle, the best target architecture is:

- keep the API as the issuer/verifier of Gatherle JWTs
- use NextAuth as the webapp session broker
- use Google first as the first external provider
- add Apple next
- preserve credentials login
- consider email magic link and phone OTP soon after

This gives the project:

- lower onboarding friction
- better product fit for a consumer event platform
- minimal disruption to existing API authorization logic
- consistent GraphQL and WebSocket identity
- a safer path to multi-provider auth without weakening application authorization

---

## Short Version

The current app already has the right core boundary: the API owns authorization and issues the token that the API and
WebSocket layer trust. The desired state should preserve that.

The change is not “replace JWT auth with Google OAuth.” The change is:

- let Google prove identity at sign-in
- let the Gatherle API exchange that identity for a Gatherle user and Gatherle JWT
- keep the rest of the system using the Gatherle JWT exactly as it does today

That is the cleanest fit for this codebase and product.
