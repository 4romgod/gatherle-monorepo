# Environment & Secrets Reference

## Environment Validation Strategy

The API uses a **lazy validation** approach for environment variables:

- **At import time**: Environment variables are parsed with default values but NOT validated
- **At runtime**: Validation only occurs when calling `validateEnv()` explicitly
- **Server startup**: All server entry points (Express dev server, Lambda handler, seed script) call `validateEnv()`
  before connecting to resources
- **Build/schema scripts**: Scripts like `emit-schema`, TypeScript compilation, and linting work without any environment
  variables since they don't call `validateEnv()`

This approach allows build tools, schema generation, and type checking to work in CI/CD without requiring secrets, while
ensuring production deployments fail fast if configuration is missing.

## API (`apps/api`)

### Build & Schema Commands (No Env Vars Required)

The following commands work without any environment variables:

- `npm run emit-schema` - Generates GraphQL schema file
- `npm run build:ts` - TypeScript compilation
- `npm run typecheck` - Type checking
- `npm run lint` - Linting

### Local development (Dev stage)

- Source: `.env` (e.g., `apps/api/.env.local` or root `.env` used with `dotenv` in `environmentVariables.ts`).
- Required keys:
  - `STAGE` (default `Beta`).
  - `AWS_REGION` (defaults to `eu-west-1`).
  - `MONGO_DB_URL` **MUST include a database name** (e.g., `mongodb://localhost:27017/gatherle`) to prevent collections
    from vanishing on reconnects. Without a database name, Mongoose defaults to the "test" database.
  - `JWT_SECRET` (used directly from the file).
  - `S3_BUCKET_NAME` (optional for local dev; required when using image upload functionality).
- `GRAPHQL_URL` defaults to `http://localhost:9000/v1/graphql`, so you no longer need to supply `API_DOMAIN`/`API_PORT`
  locally.
- Change the dev server port via `PORT` if you need something other than 9000; the default URL will follow that port
  automatically.
- `GATHERLE_SECRET_ARN` is **not required** locally—dev never reads Secrets Manager.

### Deployed stages (Staging/Prod)

- Secrets Manager stores `MONGO_DB_URL` and `JWT_SECRET` inside a secret whose name follows
  `gatherle/backend/${STAGE.toLowerCase()}` (for example `gatherle/backend/beta`).
- CDK injects these into the lambda by looking up that secret via `Secret.fromSecretNameV2` and supplying
  `GATHERLE_SECRET_ARN` (the actual ARN returned by Secrets Manager) and `AWS_REGION`.
- Lambda environment:
  - `STAGE` (from CI/CD).
  - `GATHERLE_SECRET_ARN` (required ARN, not just the string `gatherle/backend/${STAGE.toLowerCase()}`; the ARN is
    passed verbatim).
  - `AWS_REGION` (should align with where the stack is deployed).
  - `S3_BUCKET_NAME` (S3 bucket for image storage; must be configured in deployment environment).
  - `NODE_OPTIONS` (handled in CDK, no manual change).

### E2E tests

E2E tests use the `STAGE` environment variable to determine which endpoint to test against.

#### Local testing (STAGE=Dev, default)

- Run: `npm run test:e2e -w @gatherle/api`
- Requires: `MONGO_DB_URL`, `JWT_SECRET`, `STAGE=Dev`
- Behavior: Spins up local server at `http://localhost:9000/v1/graphql`, runs tests, cleans up test data automatically

#### Remote testing (STAGE=Beta or STAGE=Prod)

- Run: `STAGE=Beta GRAPHQL_URL=<endpoint> npm run test:e2e -w @gatherle/api`
- Required env: `STAGE`, `GRAPHQL_URL`, `GATHERLE_SECRET_ARN`, `AWS_REGION`
- Behavior: Tests against deployed endpoint without starting a server, skips automatic cleanup
- Example: Post-deployment tests in CI/CD run against the freshly deployed API endpoint with `STAGE=Beta`

## Webapp (`apps/webapp`)

### Local development

- Source: `apps/webapp/.env`.
- Keys:
  - `NEXT_PUBLIC_JWT_SECRET` (mirrors API secret for client-side helpers).
  - `NEXT_PUBLIC_GRAPHQL_URL` (e.g., `http://localhost:9000/v1/graphql`).
  - `NEXT_PUBLIC_WEBSOCKET_URL` (e.g., `ws://localhost:3001` or deployed `wss://.../<stage>` endpoint for realtime
    notifications).
- These values stay local and are never checked in (respect `.gitignore` for `.env*`).

### Production & Staging

- Host or CI (e.g., Vercel) should inject `NEXT_PUBLIC_JWT_SECRET` and `NEXT_PUBLIC_GRAPHQL_URL`.
- Also inject `NEXT_PUBLIC_WEBSOCKET_URL` when realtime notification updates are enabled.
- `NEXT_PUBLIC_GRAPHQL_URL` can come from the API deploy job output (`GRAPHQL_URL`).
- `NEXT_PUBLIC_JWT_SECRET` should be sourced from the same Secrets Manager secret or another secure vault and exposed
  only to the frontend build pipeline.

### E2E tests (Playwright)

- Run (workspace): `npm run test:e2e -w @gatherle/webapp`
- Run (root alias): `npm run test:e2e:web`
- Required: `PLAYWRIGHT_BASE_URL` must point to the deployed/running webapp URL.
- Optional overrides:
  - `PLAYWRIGHT_SLOW_MO` to slow browser actions for debug-friendly videos (example: `250`).
  - `PLAYWRIGHT_DEBUG_HOLD_MS` to pause before each test closes so short-flow videos have visible duration (example:
    `1500`).
- Prerequisite: Playwright browsers installed (for example `npx playwright install chromium`; on Linux CI use
  `npx playwright install --with-deps chromium`).

## CI/CD (`.github/workflows/pipeline.yaml`)

- Secrets & vars needed in GitHub:
  1. `ASSUME_ROLE_ARN` – secret, used when configuring AWS credentials.
  2. `AWS_REGION` – can live in repository **variables** (no need to mark it as a secret).
  3. `STAGE` – repository variable (default `Beta`, override for prod).
  4. `GATHERLE_SECRET_ARN` – if tests or later steps run outside AWS, pass the ARN (or re-export it) so e2e tests/webapp
     builds can reach the same secrets.
- CDK deploy step passes:
  - `STAGE` (via `vars.STAGE`).
  - `AWS_REGION` (via props, default `eu-west-1`).
  - `GATHERLE_SECRET_ARN` (the actual ARN from the secret).
- After deployment:
  - Capture `GRAPHQL_URL` output.
  - Run e2e tests with `STAGE`, `GATHERLE_SECRET_ARN`, `GRAPHQL_URL`.
  - For the frontend deploy, surface `NEXT_PUBLIC_GRAPHQL_URL` (`GRAPHQL_URL`) plus `NEXT_PUBLIC_JWT_SECRET` (from the
    secret) using GitHub env/outputs without hardcoding.

## Next steps to keep things tidy

- Keep this file in sync with `AGENTS.md` so the team always knows where to look for environment rules.
- Add an env validation script (or re-enable the commented `zod` schema in `environmentVariables.ts`) to force devs/CICD
  to satisfy the right keys per `STAGE`.
- Update the pipeline to pass `NEXT_PUBLIC_*` values securely instead of the placeholder `secret`; consider introducing
  a small job that writes those values to `${GITHUB_ENV}` after API deployment.
- Propagate the `GATHERLE_SECRET_ARN` ARN (not just the secret name) everywhere the API runs so the lambda and tests can
  actually resolve the secret.
