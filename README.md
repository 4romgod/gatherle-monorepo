# Ntlango Monorepo

Unified workspace for the Ntlango stack: GraphQL API, web app, shared commons, infrastructure, and tooling.

## Layout
- `apps/api` – TypeScript GraphQL API (Apollo/Express)
- `apps/webapp` – Next.js frontend
- `packages/commons` – Shared types, validation, and constants
- `infra` – AWS CDK stacks for deploying the API
- `tools/cli` – Python CLI utilities

## Backend architecture (apps/api)
- **Schema & resolvers:** TypeGraphQL schema built in `apps/api/lib/graphql/schema/index.ts` with resolvers in `apps/api/lib/graphql/resolvers`.
- **Server runtime:** Apollo Server configuration in `apps/api/lib/graphql/apollo` (Express for local dev, Lambda handler for AWS).
- **GraphQL path:** `/v1/graphql` (see `apps/api/lib/constants/constants.ts`); health check at `/health`.
- **Models & persistence:** Typegoose models are defined in `packages/commons/lib/types` and instantiated via Mongoose models in `apps/api/lib/mongodb/models`.
- **Data access:** DAOs in `apps/api/lib/mongodb/dao` provide the main CRUD/query surface and are used by resolvers.
- **Validation:** Zod schemas in `apps/api/lib/validation/zod`, enforced by `validateInput` helpers.
- **Auth:** JWT-based auth in `apps/api/lib/utils/auth.ts` with role + ownership checks for sensitive mutations.

## Prerequisites
- Node 22.x and npm (workspace-aware). No pnpm needed.
- Docker (only if you build the API image).
- AWS creds + CDK bootstrap if you want to synth/deploy infra.

## Install
- From repo root: `npm install`
- Workspaces: use `npm install -w @ntlango/api` (etc.) from the root if you only need one package.

## Environment
- API (`apps/api`): expects `JWT_SECRET`, `MONGO_DB_URL`, `STAGE` (e.g., `dev`), `AWS_REGION`, and optional `NTLANGO_SECRET_ARN` for Secrets Manager.
- Web (`apps/webapp`): needs `NEXT_PUBLIC_GRAPHQL_URL` pointing at the running API for codegen/build.
- Place env vars in a `.env` per workspace or export them before running commands.

## Run / Build
- API dev: `npm run dev:api` (nodemon on `apps/api/lib/scripts/startServer.ts`).
- API tests: `npm run test:unit -w @ntlango/api` (runs in-band).
- API build: `npm run build:ts -w @ntlango/api`
- Web dev: set `NEXT_PUBLIC_GRAPHQL_URL`, then `npm run dev:web`
- Web build: `npm run build -w @ntlango/webapp` (skips codegen if URL missing).
- CDK synth: `npm run build:cdk -w @ntlango/cdk` (bundles lambdas; requires AWS access).
- Full monorepo build: `npm run build` (runs API build+tests, web build, commons, CDK synth).

## Notes
- Internal package links use npm workspaces with matching versions (`@ntlango/commons@1.0.0`); keep versions aligned if you publish.
- If codegen is noisy offline, export a dummy `NEXT_PUBLIC_GRAPHQL_URL` or rely on the skip logic in the web `codegen` script.
- Jest workers sometimes crash in big repos; API tests are forced to `--runInBand` for stability.
- Domain model details live in `docs/data-model.md` and map directly to types in `packages/commons/lib/types`.

## Common commands
- Build everything: `npm run build`
- API dev server: `npm run dev:api`
- Web dev server: `npm run dev:web`
- API tests: `npm run test:unit -w @ntlango/api`
- CDK synth: `npm run build:cdk -w @ntlango/cdk`
