# Repository Guidelines

## Project Structure & Module Organization

- Monorepo root uses npm workspaces; run commands from the root.
- `apps/api`: TypeScript GraphQL API (Apollo/Express). Tests live in `apps/api/test/{unit,integration,canary}`.
- `apps/webapp`: Next.js frontend (MUI + Tailwind). Codegen depends on `NEXT_PUBLIC_GRAPHQL_URL`.
- `packages/commons`: Shared types, validation, and constants consumed by other workspaces.
- `infra`: AWS CDK stacks for API deployment; expects AWS creds and bootstrap.
- `tools/cli`: Python utilities; keep in sync with API contracts when modifying schemas.

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
- API build + unit tests: `npm run build -w @ntlango/api`; TS-only: `npm run build:ts -w @ntlango/api`.
- API test suites: `npm run test:unit -w @ntlango/api`, `npm run test:integration -w @ntlango/api`,
  `npm run test:canary -w @ntlango/api`.
- Web dev: export `NEXT_PUBLIC_GRAPHQL_URL`, then `npm run dev:web`. Prod build: `npm run build -w @ntlango/webapp`.
- Commons build: `npm run build -w @ntlango/commons`. CDK synth: `npm run build:cdk -w @ntlango/cdk`.
- Repo-wide helpers: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (scoped via workspaces).

## Coding Style & Naming Conventions

- TypeScript everywhere; `tsconfig.base.json` enforces strict mode and path aliases (`@ntlango/commons/*`).
- Prettier 3 is the formatter (`apps/api/.prettierrc.json`, `packages/commons/.prettierrc.json`); Next app uses
  `prettier` with the Tailwind plugin via `lint:fix`.
- Prefer camelCase for variables/functions, PascalCase for types/components, kebab-case for files and workspace
  packages.
- Keep shared contracts in `packages/commons` and re-export types instead of duplicating.

## Testing Guidelines

- API tests use Jest; files end with `.test.ts` under `apps/api/test/{unit,integration,canary}/spec`.
- Unit tests run in-band for stability; integration tests expect MongoDB + JWT config. Use `.env` per workspace or
  exported vars before running.
- Aim to cover resolvers, validation, and query helpers when touching API logic; add fixtures under
  `apps/api/test/utils`.
- Web app currently lacks automated tests—add component or integration tests colocated with features when introducing
  new UI.

## Commit & Pull Request Guidelines

- Use concise, present-tense commit subjects (`feat: add event category validation`, `fix: handle missing jwt secret`)
  and group related changes.
- For PRs, include: scope/summary, linked issue/ticket, env variables touched, and test evidence (commands run +
  outputs). Add screenshots/GIFs for UI changes in `apps/webapp`.
- Keep workspaces version-aligned (`@ntlango/*@1.0.0`) when publishing; avoid committing secrets or `.env` files.

## Adding/Updating Domain Models

- Add or update TypeGraphQL/Typegoose types in `packages/commons/lib/types` and re-export from
  `packages/commons/lib/types/index.ts`.
- Add matching Mongoose models in `apps/api/lib/mongodb/models` and update `apps/api/lib/mongodb/models/index.ts`.
- Add DAO logic under `apps/api/lib/mongodb/dao` and wire it into resolvers in `apps/api/lib/graphql/resolvers`.
- Update validation in `apps/api/lib/validation/zod` for new inputs; use `validateInput` helpers in resolvers.

## Security & Configuration Tips

- Required env vars: API (`JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `NTLANGO_SECRET_ARN`); Web
  (`NEXT_PUBLIC_GRAPHQL_URL`); CDK requires AWS creds.
- Never commit secrets; use `.env` files ignored by git. For CDK, ensure AWS bootstrap is done per account/region before
  synth/deploy.
- **Secret/Env Management**
  - Keep a workspace-specific `.env` file per project (`apps/api/.env.local`, `apps/webapp/.env.local`, etc.) and never
    commit it; add `.env.*` to `.gitignore` if not already ignored.
  - Document required keys per workspace so contributors know what to populate before running scripts: the API needs
    `JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `NTLANGO_SECRET_ARN`; the webapp consumes
    `NEXT_PUBLIC_GRAPHQL_URL` (and uses `NEXT_PUBLIC_JWT_SECRET` wherever the client-side auth config expects it).
  - For local dev run `npm run dev:api`/`npm run dev:web` with the matching `.env` or by exporting the vars, and
    consider adding `dotenv` helpers or scripts to validate the presence of required keys before starting.
  - Share secret values via a secure vault (e.g., AWS Secrets Manager, 1Password, or the team-approved store) and keep
    the `NTLANGO_SECRET_ARN` format consistent with `vars.STAGE/ntlango/graphql-api` for AWS-integrated lookups.

## CI/CD Secrets & Environment Variables

- The pipeline uses GitHub Workflows (`.github/workflows/pipeline.yaml`) with two jobs: `pr-check` (lint/build/test) and
  `api-deploy` (CDK deploy + integration tests). Ensure each job runs from the root so workspace commands resolve
  correctly.
- Global workflow env: `STAGE` defaults to `Beta`, but production pushes should override via GitHub repository variables
  (matching the stage naming in `packages/commons`).
- Secrets/variables required in GitHub:
  - `ASSUME_ROLE_ARN`: Role the CDK deploy job assumes (set under repo Settings → Secrets).
  - `AWS_REGION`: Region used both for `configure-aws-credentials` and to satisfy `apps/api` env expectations.
  - Repository `Variables`: `STAGE` (e.g., `Beta`, `Prod`) and `NTLANGO_SECRET_ARN` variants (e.g.,
    `${{ vars.STAGE }}/ntlango/graphql-api`) so integration tests know where to resolve secrets.
- Workflow flow for `api-deploy`:
  1. Checkout → Install deps → CDK tools.
  2. Build API/commons/CDK packages.
  3. Configure AWS creds via the assumed role secret + `AWS_REGION`.
  4. Deploy CDK stacks (`npm run cdk -w @ntlango/cdk -- deploy '*' --verbose`) with `STAGE` from repo vars.
  5. Query CloudFormation output for `apiPath`, expose as `GRAPHQL_URL` via `$GITHUB_ENV`/`$GITHUB_OUTPUT`.
  6. Run integration tests with `STAGE`, `NTLANGO_SECRET_ARN`, `GRAPHQL_URL`.
- Future webapp deploys should consume `NEXT_PUBLIC_GRAPHQL_URL` + `NEXT_PUBLIC_JWT_SECRET` from the API deploy output
  or stored secrets and include a secure way to inject these into the build (e.g., GitHub Actions env or
  `next.config.js` referencing process env).

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
- **`.github/prompts/*.prompt.md`** – Task/plan templates (the `plan-*` files) and aliases (`pr`, etc.). Open the
  relevant prompt before executing a plan to honor its assumptions.

When you encounter a request that aligns with a specific agent or prompt, cite the file name in your reasoning and
follow that file's instructions (e.g., start with the `'pr'` prompt above when generating PR materials, or review the
`plan-*` prompt for multi-step UI/UX work).
