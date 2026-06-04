# Commons Boundary

`@gatherle/commons` now exposes only two supported import surfaces:

- `@gatherle/commons/client/*` for browser-safe and React Native-safe shared code
- `@gatherle/commons/server/*` for API, infrastructure, and other Node-only code

Legacy root imports and legacy root subpaths are no longer part of the contract.

## Frontend

Allowed:

- `@gatherle/commons/client`
- `@gatherle/commons/client/constants`
- `@gatherle/commons/client/utils`
- `@gatherle/commons/client/validation`

Do not import:

- `@gatherle/commons`
- `@gatherle/commons/types`
- `@gatherle/commons/constants`
- `@gatherle/commons/utils`
- `@gatherle/commons/validation`

GraphQL request and response shapes still come from each frontend app's generated GraphQL types.

## Backend And Infrastructure

Allowed:

- `@gatherle/commons/server`
- `@gatherle/commons/server/constants`
- `@gatherle/commons/server/types`
- `@gatherle/commons/server/utils`
- `@gatherle/commons/server/validation`

Do not import:

- `@gatherle/commons`
- `@gatherle/commons/types`
- `@gatherle/commons/constants`
- `@gatherle/commons/utils`
- `@gatherle/commons/validation`

Backend model classes, enums, constants, and Node-only helpers should stay on the `server` surface.

## Guardrails

- Webapp, mobile, and API each have lint rules blocking legacy `commons` imports.
- Root lint also runs `scripts/check-commons-boundaries.mjs`, which scans app, infrastructure, and config code for
  legacy `commons` paths.

## Migration Rule

When adding new shared code:

- put browser-safe runtime code in `packages/commons/lib/client`
- put Node-only runtime code in `packages/commons/lib/server`
- do not add new consumers of the legacy root surface
