# Commons Client Boundary

The repo-wide contract now lives in [docs/commons-boundary.md](../commons-boundary.md).

Frontend code must treat `@gatherle/commons` as two separate surfaces:

- `@gatherle/commons/client/*` is the only browser-safe/runtime-safe surface for `apps/webapp` and `apps/mobile`.
- Server-only GraphQL and Mongo model code stays outside frontend imports.

## Allowed Frontend Imports

- `@gatherle/commons/client`
- `@gatherle/commons/client/constants`
- `@gatherle/commons/client/utils`
- `@gatherle/commons/client/validation`

Use these for shared constants, pure helpers, and frontend validation primitives.

## Forbidden Frontend Imports

- `@gatherle/commons`
- `@gatherle/commons/types`
- `@gatherle/commons/utils`
- `@gatherle/commons/validation`
- Any deep import that reaches files using `mongoose`, `@typegoose/typegoose`, `type-graphql`, or `reflect-metadata`

These paths are server-oriented and will break browser or React Native bundles.

## Type Ownership

- GraphQL request and response types for webapp and mobile come from each app's generated GraphQL types.
- TypeGraphQL and Typegoose model classes in `packages/commons/lib/types` are API implementation details, not frontend
  contracts.
- When a frontend-safe enum, constant, or helper needs sharing, add it to `packages/commons/lib/client` instead of
  importing backend model files.

## Validation Rule

Share validation primitives across frontend surfaces, not backend form schemas.

- Good: password rules, date input helpers, regex/constants
- Avoid: importing API-facing Zod objects that depend on backend enums or model code

## Dev Workflow

Root frontend dev scripts already build and watch `@gatherle/commons` before starting webapp or mobile:

- `npm run dev:web`
- `npm run dev:mobile`
- `npm run dev:mobile:lan`
- `npm run dev:mobile:tunnel`

Use those scripts when working on shared frontend code so `commons` stays rebuilt as you edit it.
