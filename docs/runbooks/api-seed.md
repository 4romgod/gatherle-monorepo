# API Seed Runbook

This runbook covers the supported database seed flows for `@gatherle/api`.

Run all commands from the repository root.

## Purpose

There are two supported seed modes:

- `mock` for local dev/demo data
- `catalog + system-users + public-events` for a launch-like dataset built from curated public events

There is also one convenience mode:

- `dev` for local setup that combines system users with mock/demo data

These flows are intentionally separate. Do not mix them in the same database unless you explicitly want both mock and
public/imported data together.

## Prerequisites

Before running any seed script, make sure the API can connect to MongoDB and has its normal runtime env available.

At minimum, have the API workspace env set up for:

- `MONGO_DB_URL`
- `JWT_SECRET`
- `STAGE`
- `AWS_REGION`

Seeded user passwords are not stored in the repository. Each seed flow either:

- reads passwords from env vars, or
- prompts for them in the terminal with hidden input

## Seed Data Layout

Current data sources live under:

- `apps/api/lib/mongodb/data/catalog`
- `apps/api/lib/mongodb/data/system`
- `apps/api/lib/mongodb/data/seed`
- `apps/api/lib/mongodb/data/mock`

Current seed entry points live under:

- `apps/api/lib/scripts/seed/catalog`
- `apps/api/lib/scripts/seed/system`
- `apps/api/lib/scripts/seed/public`
- `apps/api/lib/scripts/seed/mock`

## Script Summary

- `npm run seed:catalog -w @gatherle/api`
  - seeds event categories and category groups only
- `npm run seed:system-users -w @gatherle/api`
  - seeds the imports system user plus the reusable test users
  - requires the catalog to already exist
- `npm run seed:dev -w @gatherle/api`
  - seeds catalog, then system users, then mock/demo data
- `npm run seed:public-events -w @gatherle/api`
  - seeds curated public Gauteng organizations and events
  - requires the catalog and system users to already exist
- `npm run seed:mock -w @gatherle/api`
  - seeds mock/demo data
  - requires the catalog to already exist
- `npm run geocode-events -w @gatherle/api`
  - geocodes seeded event locations after the event seed completes

## Seeded System Users

`seed:system-users` creates or updates these accounts:

- `imports@gatherle.com`
- `test-admin@gatherle.com`
- `test-user@gatherle.com`
- `test-user2@gatherle.com`

Password env vars:

- `GATHERLE_IMPORTS_PASSWORD`
- `GATHERLE_TEST_ADMIN_PASSWORD`
- `GATHERLE_TEST_USER_PASSWORD`
- `GATHERLE_TEST_USER2_PASSWORD`

If any of these are unset, the script prompts for them.

## Mock Flow

Use this when you want a full local demo dataset.

What it seeds:

- mock users
- mock organizations
- mock venues
- mock events
- organization memberships
- follows
- activity
- seeded RSVPs/participants

Password env vars used by this flow:

- `GATHERLE_MOCK_USERS_PASSWORD`

Recommended command:

```bash
npm run seed:catalog -w @gatherle/api
npm run seed:mock -w @gatherle/api
```

Non-interactive example:

```bash
export GATHERLE_MOCK_USERS_PASSWORD='...'
npm run seed:catalog -w @gatherle/api
npm run seed:mock -w @gatherle/api
```

Notes:

- `seed:mock` requires the catalog to already exist.
- `seed:mock` does not seed any system users.
- If you want test users alongside mock data, use `seed:dev`.

## Dev Flow

Use this when you want local demo data plus the seeded test/system users.

What it seeds:

- catalog
- seeded system users
- mock users
- mock organizations
- mock venues
- mock events
- organization memberships
- follows
- activity
- seeded RSVPs/participants

Password env vars used by this flow:

- `GATHERLE_IMPORTS_PASSWORD`
- `GATHERLE_TEST_ADMIN_PASSWORD`
- `GATHERLE_TEST_USER_PASSWORD`
- `GATHERLE_TEST_USER2_PASSWORD`
- `GATHERLE_MOCK_USERS_PASSWORD`

Recommended command:

```bash
npm run seed:dev -w @gatherle/api
```

Non-interactive example:

```bash
export GATHERLE_IMPORTS_PASSWORD='...'
export GATHERLE_TEST_ADMIN_PASSWORD='...'
export GATHERLE_TEST_USER_PASSWORD='...'
export GATHERLE_TEST_USER2_PASSWORD='...'
export GATHERLE_MOCK_USERS_PASSWORD='...'
npm run seed:dev -w @gatherle/api
```

Notes:

- `seed:dev` is the convenience local setup flow.
- It is equivalent to running catalog, then system-users, then mock.

## Launch-Like Public Events Flow

Use this when you want a cleaner dataset based on curated public event listings.

What it seeds:

- imports system user
- reusable seeded test users
- imported host organizations
- imported Gauteng public events

Recommended order:

```bash
npm run seed:catalog -w @gatherle/api
npm run seed:system-users -w @gatherle/api
npm run seed:public-events -w @gatherle/api
npm run geocode-events -w @gatherle/api
```

Non-interactive example:

```bash
export GATHERLE_IMPORTS_PASSWORD='...'
export GATHERLE_TEST_ADMIN_PASSWORD='...'
export GATHERLE_TEST_USER_PASSWORD='...'
export GATHERLE_TEST_USER2_PASSWORD='...'
npm run seed:catalog -w @gatherle/api
npm run seed:system-users -w @gatherle/api
npm run seed:public-events -w @gatherle/api
npm run geocode-events -w @gatherle/api
```

Notes:

- `seed:system-users` requires the catalog because the test users can be seeded with interests.
- `seed:public-events` fails fast if the imports user does not already exist.
- `geocode-events` should be run after public events are seeded so map and nearby behavior have coordinates.

## Recommended Reset Pattern

When switching between `mock` and `public-events` flows, start from a clean database.

This avoids mixing:

- fake demo organizations/events
- curated public imported organizations/events

## Smoke Checks

After seeding, verify at least these basics:

- seeded test users can log in
- event categories exist
- organizations exist
- events load in list and detail views
- imported events show the organization as host instead of the imports system user

For the public-events flow, also verify:

- imported event links are present
- geocoded locations exist after `geocode-events`

## Supported Operational Flows

Use these as the default rules:

- local demo data only: `seed:catalog` → `seed:mock`
- local demo data plus seeded test users: `seed:dev`
- launch-like local or beta dataset: `seed:catalog` → `seed:system-users` → `seed:public-events` → `geocode-events`

If the seed structure changes, update this document in the same PR.
