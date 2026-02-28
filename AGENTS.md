# Repository Guidelines

## Project Structure & Module Organization

- Monorepo root uses npm workspaces; run commands from the root.
- `apps/api`: TypeScript GraphQL API (Apollo/Express). Tests live in `apps/api/test/{unit,e2e,canary}`.
- `apps/webapp`: Next.js frontend (MUI + Tailwind). Codegen depends on `NEXT_PUBLIC_GRAPHQL_URL`.
- `packages/commons`: Shared types, validation, and constants consumed by other workspaces.
- `infra`: AWS CDK stacks for API deployment; expects AWS creds and bootstrap.
- `apps/ops-cli`: Python utilities; keep in sync with API contracts when modifying schemas.

## Backend Architecture (API)

- GraphQL schema is built with TypeGraphQL (`apps/api/lib/graphql/schema/index.ts`) and uses resolvers in
  `apps/api/lib/graphql/resolvers`.
- Apollo server setup lives in `apps/api/lib/graphql/apollo` (Express for local dev, Lambda handler for infra).
- GraphQL endpoint path is `/v1/graphql`; the dev server also exposes `/health`.
- Models are Typegoose classes defined in `packages/commons/lib/types` and instantiated in
  `apps/api/lib/mongodb/models`.
- Data access is centralized in DAOs under `apps/api/lib/mongodb/dao`, which are used by resolvers.
- Input validation uses Zod schemas in `apps/api/lib/validation/zod` plus shared validation helpers in
  `apps/api/lib/validation`.
- Auth uses JWTs (`apps/api/lib/utils/auth.ts`) and TypeGraphQL `@Authorized` with ownership checks for sensitive
  mutations.

## Build, Test, and Development Commands

- Install deps: `npm install` (root). Workspace-only: `npm install -w <workspace>`.
- API dev server: `npm run dev:api` (scoped; avoids workspace fan-out).
- API build + unit tests: `npm run build -w @gatherle/api`; TS-only: `npm run build:ts -w @gatherle/api`.
- API test suites: `npm run test:unit -w @gatherle/api`, `npm run test:e2e -w @gatherle/api`,
  `npm run test:canary -w @gatherle/api`.
- Web dev: export `NEXT_PUBLIC_GRAPHQL_URL`, then `npm run dev:web`. Prod build: `npm run build -w @gatherle/webapp`.
- Web e2e tests: `npm run test:e2e -w @gatherle/webapp` (Playwright).
- Commons build: `npm run build -w @gatherle/commons`. CDK synth: `npm run build:cdk -w @gatherle/cdk`.
- Repo-wide helpers: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (scoped via workspaces).
- **Local CI:** GitHub Actions workflows can be run locally with `act`. See [docs/local-ci.md](docs/local-ci.md) for
  setup and usage.

## Coding Style & Naming Conventions

- TypeScript everywhere; `tsconfig.base.json` enforces strict mode and path aliases (`@gatherle/commons/*`).
- Prettier 3 is the formatter (`apps/api/.prettierrc.json`, `packages/commons/.prettierrc.json`); Next app uses
  `prettier` with the Tailwind plugin via `lint:fix`.
- Prefer camelCase for variables/functions, PascalCase for types/components, kebab-case for files and workspace
  packages.
- Keep shared contracts in `packages/commons` and re-export types instead of duplicating.

## Testing Guidelines

- API tests use Jest; files end with `.test.ts` under `apps/api/test/{unit,e2e,canary}/spec`.
- Unit tests run in-band for stability; e2e tests expect MongoDB + JWT config. Use `.env` per workspace or exported vars
  before running.
- Aim to cover resolvers, validation, and query helpers when touching API logic; add fixtures under
  `apps/api/test/utils`.
- Web app e2e tests use Playwright under `apps/webapp/test/e2e`; add coverage for auth guards and critical user flows.

## Commit & Pull Request Guidelines

- Use concise, present-tense commit subjects (`feat: add event category validation`, `fix: handle missing jwt secret`)
  and group related changes.
- For PRs, include: scope/summary, linked issue/ticket, env variables touched, and test evidence (commands run +
  outputs). Add screenshots/GIFs for UI changes in `apps/webapp`.
- Keep workspaces version-aligned (`@gatherle/*@1.0.0`) when publishing; avoid committing secrets or `.env` files.

## Adding/Updating Domain Models

- Add or update TypeGraphQL/Typegoose types in `packages/commons/lib/types` and re-export from
  `packages/commons/lib/types/index.ts`.
- Add matching Mongoose models in `apps/api/lib/mongodb/models` and update `apps/api/lib/mongodb/models/index.ts`.
- Add DAO logic under `apps/api/lib/mongodb/dao` and wire it into resolvers in `apps/api/lib/graphql/resolvers`.
- Update validation in `apps/api/lib/validation/zod` for new inputs; use `validateInput` helpers in resolvers.

## Security & Configuration Tips

- Required env vars: API (`JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `SECRET_ARN`); Web
  (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_GRAPHQL_URL`, optional `NEXT_PUBLIC_WEBSOCKET_URL`); CDK requires AWS creds.
- Never commit secrets; use `.env` files ignored by git. For CDK, ensure AWS bootstrap is done per account/region before
  synth/deploy.
- **Secret/Env Management**
  - Keep a workspace-specific `.env` file per project (`apps/api/.env.local`, `apps/webapp/.env.local`, etc.) and never
    commit it; add `.env.*` to `.gitignore` if not already ignored.
  - Document required keys per workspace so contributors know what to populate before running scripts: the API needs
    `JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `SECRET_ARN`; the webapp consumes `NEXTAUTH_SECRET`,
    `NEXT_PUBLIC_GRAPHQL_URL`, and `NEXT_PUBLIC_WEBSOCKET_URL`.
  - For local dev run `npm run dev:api`/`npm run dev:web` with the matching `.env` or by exporting the vars, and
    consider adding `dotenv` helpers or scripts to validate the presence of required keys before starting.
  - Share secret values via a secure vault (e.g., AWS Secrets Manager, 1Password, or the team-approved store) and keep
    the `SECRET_ARN` format consistent with `gatherle/backend/<stage-lowercase>-<aws-region-lowercase>` (for example
    `gatherle/backend/beta-eu-west-1`) for AWS-integrated lookups.

## CI/CD Secrets & Environment Variables

- The deploy pipeline uses `.github/workflows/deploy-trigger.yaml` (orchestrator) and `.github/workflows/deploy.yaml`
  (reusable target deploy). Ensure commands run from repository root so workspace scripts resolve correctly.
- DNS deploy pipeline uses `.github/workflows/deploy-dns.yaml` (reusable DNS deploy) and is orchestrated by
  `.github/workflows/deploy-trigger.yaml`.
- Full AWS account bootstrap/onboarding runbook: `docs/aws-account-setup.md`.
- Secrets/variables required in GitHub:
  - GitHub Environment secret `ASSUME_ROLE_ARN`: Role the deploy job assumes.
  - Repository variable `ENABLE_PROD_DEPLOY`: optional gate for Prod promotion on main (set `true` to enable).
  - Repository variable `ENABLE_CUSTOM_DOMAINS`: rollout flag for API/WebSocket custom domains.
  - Deploy regions are defined directly in `.github/workflows/deploy-trigger.yaml` via matrix entries.
  - CI resolves `SECRET_ARN` dynamically from Secrets Manager using `gatherle/backend/<stage-lower>-<region>`.
- Workflow flow for `api-deploy`:
  1. `deploy-trigger` runs on `main` and calls reusable DNS deploy first, then reusable runtime deploy for `Beta`.
  2. Runtime `Prod` deployment (when enabled) runs only after `Beta` succeeds.
  3. Checkout → Install deps → CDK tools.
  4. Build API/commons/CDK packages.
  5. Configure AWS creds via the assumed role secret + `AWS_REGION`.
  6. Deploy runtime CDK stacks (for example
     `npm run cdk -w @gatherle/cdk -- deploy S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively`)
     with resolved `STAGE`/`AWS_REGION`, and deploy `SecretsManagementStack` only when secrets intentionally change.
  7. Query CloudFormation output for `apiPath`, expose as `GRAPHQL_URL` via `$GITHUB_ENV`/`$GITHUB_OUTPUT`.
  8. Run e2e tests with `STAGE`, `SECRET_ARN`, `GRAPHQL_URL`.
- DNS bootstrap workflow:
  - Use `npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively` from DNS account
    credentials to create root Route53 hosted zone for `gatherle.com`.
  - Optional DNS environment vars for delegated subdomain NS records: `DELEGATED_SUBDOMAIN`, `DELEGATED_NAME_SERVERS`.
- GitHub auth bootstrap workflow:
  - Use `npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively` with
    `AWS_REGION` and `TARGET_AWS_ACCOUNT_ID` to create the CI/CD OIDC role once per target account.
- Secrets bootstrap/rotation workflow:
  - Keep `SecretsManagementStack` out of normal deploys.
  - Deploy it manually via
    `npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively` only
    when intentionally creating or rotating `MONGO_DB_URL` and `JWT_SECRET`.
- Future webapp deploys should consume `NEXT_PUBLIC_GRAPHQL_URL` and `NEXT_PUBLIC_WEBSOCKET_URL` from deploy
  outputs/stored vars, while `NEXTAUTH_SECRET` is injected as a separate secret-managed webapp environment variable.

## Predefined Prompts & Aliases

This section contains shorthand commands that trigger predefined workflows. When a user types one of these aliases,
execute the associated workflow automatically.

**Available Commands:**

- `pr` - Generate PR materials (branch name, commit message, PR title/description)

For detailed workflow instructions, see
[.github/prompts/pr-generation.prompt.md](.github/prompts/pr-generation.prompt.md)

## Agent Files & Prompt Library

The per-domain agents and planning prompts live under `.github/` so you can review the tailored guidance before starting
work.

- **`.github/agents/api.agent.md`** – Backend engineer instructions for TypeGraphQL/MongoDB work inside `apps/api`.
- **`.github/agents/webapp.agent.md`** – Frontend/UI agent for Next.js/MUI/Tailwind jobs in `apps/webapp`.
- **`.github/agents/architect.agent.md`** – Strategic architecture leadership guidance for infra, scalability, and
  roadmap discussions.
- **`.github/agents/security.agent.md`** – Security engineering guidance for GraphQL, WebSocket, webapp, CI/CD, AWS IAM,
  and account/domain hardening.
- **`.github/prompts/*.prompt.md`** – Task/plan templates (the `plan-*` files) and aliases (`pr`, etc.). Open the
  relevant prompt before executing a plan to honor its assumptions.

When you encounter a request that aligns with a specific agent or prompt, cite the file name in your reasoning and
follow that file's instructions (e.g., start with the `'pr'` prompt above when generating PR materials, or review the
`plan-*` prompt for multi-step UI/UX work).
