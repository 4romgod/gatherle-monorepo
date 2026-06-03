Public/imported event seed data is intentionally external to the repository.

Provide a directory containing these JSON files when running `seed:public-events`:

- `organizations.json`
- `organization-media.json`
- `events.json`
- `event-media.json`

Run with either:

```bash
PUBLIC_SEED_DATA_DIR=/absolute/or/relative/path npm run seed:public-events -w @gatherle/api
```

or:

```bash
npm run seed:public-events -w @gatherle/api -- --data-dir=/absolute/or/relative/path
```

Expected JSON shapes:

- `organizations.json` Array of imported organizations:
  - `key`
  - `name`
  - optional `description`
  - optional `websiteUrl`
  - optional `tags: string[]`

- `organization-media.json` Object map of `organizationKey -> imageUrl`

- `events.json` Array of imported events:
  - `sourcePlatform`
    - allowed values: `Computicket`, `Howler`, `Joburg`, `Quicket`, `Ticketpro`, `Webtickets`, `WhatsOnInJoburg`
  - `sourceUrl`
  - `externalId`
  - `orgKey`
  - `title`
  - `summary`
  - `startsAt`
  - optional `endsAt`
  - `venueName`
  - `location`
  - `categoryNames`
  - optional `tags`

- `event-media.json` Object map of `externalId -> imageUrl`
