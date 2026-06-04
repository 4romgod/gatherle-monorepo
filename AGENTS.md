# Repository Guidelines

## Project Structure & Module Organization

- Monorepo root uses npm workspaces; run commands from the root.
- `apps/api`: TypeScript GraphQL API (Apollo/Express). Tests live in `apps/api/test/{unit,e2e,canary}`.
- `apps/webapp`: Next.js frontend (MUI + Tailwind). Codegen depends on `NEXT_PUBLIC_GRAPHQL_URL`.
- `packages/commons`: Shared types, validation, and constants consumed by other workspaces.
- `infrastructure/cdk`: AWS CDK stacks for API deployment; expects AWS creds and bootstrap.
- `infrastructure/terraform`: Terraform configurations for provider-managed infrastructure.
- `apps/ops-cli`: Python CLI for operational tasks (seeding, migrations, etc.); keep in sync with API contracts when
  modifying schemas.

## Backend Architecture (API)

- GraphQL schema is built with TypeGraphQL (`apps/api/lib/graphql/schema/index.ts`) and uses resolvers in
  `apps/api/lib/graphql/resolvers`.
- Apollo server setup lives in `apps/api/lib/graphql/apollo` (Express for local dev, Lambda handler for production).
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

## Frontend Workspace Guidance

- Treat the frontend as **two product surfaces**:
  - `apps/webapp` for Next.js/MUI/Tailwind
  - `apps/mobile` for Expo React Native
- The default parity target is **the mobile app and the mobile-sized webapp**, not the desktop webapp.
- Before changing a user-facing flow on one surface, inspect the other surface and decide whether the current difference
  is intentional or just drift.

### Webapp Structure

- `apps/webapp/app`: Next.js App Router routes and route groups, including `(protected)` and `auth/*`.
- `apps/webapp/components`: shared web UI by domain (`events`, `messages`, `organization`, `venue`, `navigation`,
  `core`, etc.).
- `apps/webapp/data/graphql`: generated GraphQL docs/types plus query and mutation definitions.
- `apps/webapp/hooks`, `apps/webapp/lib`, `apps/webapp/public`, `apps/webapp/test`.
- Before writing or materially changing web UI, read and apply `docs/webapp/design-system.md`.
- The default web visual language is Elevation Zero unless the task is explicitly constrained by an existing surface.

### Mobile Structure

- `apps/mobile/src/app`: app shell only
  - `navigation`: root navigation, tab bar, drawer, header shell
  - `providers`: app-wide providers and session shell
  - `theme`: palette, typography, `AppThemeProvider`
- `apps/mobile/src/screens`: route-level screens, organized by domain (`auth`, `events`, `messages`, `moments`, etc.)
- `apps/mobile/src/components`: reusable UI by domain
- `apps/mobile/src/hooks`: reusable React hooks
- `apps/mobile/src/lib`: non-React helpers and product utilities
- App shell providers are inlined in `apps/mobile/App.tsx`.
- Bottom sheets use `@gorhom/bottom-sheet`.
- Mobile auth is token/device-session based, not NextAuth.
- Secure local storage uses Expo SecureStore through the shared device storage layer.

### Common Frontend Commands

- Web:
  - `npm run dev:web`
  - `npm run typecheck -w @gatherle/webapp`
  - `npm run codegen -w @gatherle/webapp`
  - `npm run test:e2e -w @gatherle/webapp`
- Mobile:
  - `npm run start -w @gatherle/mobile`
  - `npm run start:lan -w @gatherle/mobile`
  - `npm run android -w @gatherle/mobile`
  - `npm run typecheck -w @gatherle/mobile`
  - `npm run codegen -w @gatherle/mobile`
  - `npm run apk:release -w @gatherle/mobile`
  - `npm run apk:install -w @gatherle/mobile`
- Shared frontend/backend contract:
  - `npm run emit-schema -w @gatherle/api`

### Common Frontend Workflows

- Webapp uses NextAuth/browser-session semantics; mobile uses local token restoration with device storage.
- Both surfaces use the same GraphQL backend and generated types. If a frontend feature needs backend changes, update
  the contract, regenerate schema/types, then update both consumers when parity is expected.
- Mobile uses `@gorhom/bottom-sheet`, explicit app-shell providers in `apps/mobile/App.tsx`, and shared feedback
  patterns (blocking loader + toast/snackbar style feedback).
- Media flows often use pre-signed upload URLs. When changing avatar/media behavior, verify that uploads, previews,
  persistence, and cache invalidation all behave correctly on the target surface.
- Moments/stories are core product surfaces. Be careful about parity across:
  - regular moment viewer
  - vertical moments feed
  - moment reply deep links
  - video readiness/mute/progress behavior

### Frontend Architecture Rule

- New frontend code should follow the current structure rather than reintroducing parallel patterns.
- For mobile specifically:
  - app shell concerns belong in `src/app`
  - route screens belong in `src/screens`
  - reusable UI belongs in `src/components`
  - hooks belong in `src/hooks`
  - non-React utilities belong in `src/lib`
- Avoid recreating duplicate organizational models once a cleanup direction has been chosen.

### Frontend File Placement Rules

Use these rules when creating new frontend files so the structure stays consistent.

#### Mobile (`apps/mobile`)

- `App.tsx`
  - app entry only
  - compose top-level providers and root app shell
  - do not place reusable UI or business logic here
- `src/app/navigation`
  - app-shell navigation only
  - navigators, route definitions, route params/types, drawer/tab/header shell components
  - examples: `RootNavigator`, `routes.ts`, `AppDrawer`, `BottomTabBar`, `HeaderMenuButton`
- `src/app/providers`
  - app-wide providers and global runtime wrappers
  - examples: session shell, drawer state, feedback/toast provider, preview session provider
- `src/app/theme`
  - palette, typography, theme provider, theme helpers/constants
  - do not create a second `shared/theme` or `components/theme` folder
- `src/screens/<domain>`
  - route-level screens only
  - if it is mounted directly by navigation, it belongs here
  - examples: `screens/events/EventsScreen.tsx`, `screens/account/EditProfileScreen.tsx`
- `src/components/core`
  - cross-domain reusable UI primitives
  - examples: buttons, chips, page containers, loaders, toast surfaces, shared form atoms
- `src/components/<domain>`
  - reusable UI for one product area, used by multiple screens or multiple components in that area
  - examples:
    - `components/moments/MomentViewer.tsx`
    - `components/events/EventsFilterSheet.tsx`
    - `components/messages/ChatComposer.tsx`
- `src/hooks`
  - reusable React hooks
  - put hooks here when they are reused or encapsulate meaningful UI/app-state behavior
  - do not hide reusable hooks inside a screen file unless they are truly local implementation details
- `src/lib/<domain>`
  - non-React code only
  - examples: upload helpers, storage helpers, formatters, serializers, constants, pure utilities
  - if it does not render JSX and does not use React hooks, it probably belongs here
- `data/graphql/query`, `data/graphql/mutation`, `data/graphql/types`
  - GraphQL documents and generated artifacts only
  - keep mobile GraphQL operations here, not inside `src/screens` or `src/components`

Do not create new mobile folders that reintroduce old parallel patterns:

- no new `src/features`
- no new `src/shared`
- no new `src/components/navigation`
- no new `src/shared/theme`

#### Webapp (`apps/webapp`)

- `app/**`
  - Next.js App Router routes, layouts, route groups, metadata, route-local loading/error states
  - if it is a page, layout, route handler, or route-local server action wrapper, it belongs under `app`
- `components/core`
  - cross-domain reusable web UI primitives and shells
- `components/<domain>`
  - reusable domain UI shared across multiple routes/components
  - examples: `components/events/*`, `components/messages/*`, `components/organization/*`
- `components/navigation`
  - web navigation UI only
  - examples: headers, nav bars, sidebars, mobile nav drawers
- `data/graphql/query`, `data/graphql/mutation`, `data/graphql/types`
  - GraphQL documents and generated types only
- `data/actions`
  - data mutations and server/client action wrappers that are intentionally centralized outside route files
- `hooks`
  - reusable React hooks
- `lib/constants`
  - shared constants and config values
- `lib/utils`
  - pure helpers and formatting utilities
- `public`
  - static assets only
- `test/e2e`, `test/unit`
  - browser and unit/integration tests

#### Placement Decision Rules

- If navigation mounts it directly, it is a screen/route file.
- If it is reused by multiple screens/routes, it is a component.
- If it is app-shell infrastructure, it belongs in `app`.
- If it is a reusable React hook, it belongs in `hooks`.
- If it is a pure helper with no JSX/hooks, it belongs in `lib`.
- If it is a GraphQL document or generated GraphQL type, it belongs in `data/graphql`.

#### Anti-Patterns

Avoid these mistakes:

- putting route screens inside `components`
- putting reusable UI inside `app`
- putting non-React helpers inside `hooks`
- creating a new parallel folder because an older file happens to live there
- reintroducing feature buckets that compete with `screens`, `components`, `hooks`, or `lib`

## Coding Style & Naming Conventions

- TypeScript everywhere; `tsconfig.base.json` enforces strict mode and the shared `@gatherle/commons/client/*` and
  `@gatherle/commons/server/*` path aliases.
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

- Required env vars: API (`JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `SECRET_ARN`, optional
  `CORS_ALLOWED_ORIGINS`); Web (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_GRAPHQL_URL`, optional `NEXT_PUBLIC_WEBSOCKET_URL`); CDK
  requires AWS creds.
- Never commit secrets; use `.env` files ignored by git. For CDK, ensure AWS bootstrap is done per account/region before
  synth/deploy.
- **Secret/Env Management**
  - Keep a workspace-specific `.env` file per project (`apps/api/.env.local`, `apps/webapp/.env.local`, etc.) and never
    commit it; add `.env.*` to `.gitignore` if not already ignored.
  - Document required keys per workspace so contributors know what to populate before running scripts: the API needs
    `JWT_SECRET`, `MONGO_DB_URL`, `STAGE`, `AWS_REGION`, optional `SECRET_ARN`, optional `CORS_ALLOWED_ORIGINS`
    (explicit `http(s)` origins only, no `*`); the webapp consumes `NEXTAUTH_SECRET`, `NEXT_PUBLIC_GRAPHQL_URL`, and
    `NEXT_PUBLIC_WEBSOCKET_URL`.
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
     `npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively`)
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
- **`.github/agents/frontend.agent.md`** – Shared frontend agent for `apps/webapp` and `apps/mobile`, with parity focus
  between the mobile app and the mobile-sized webapp.
- **`.github/agents/architect.agent.md`** – Strategic architecture leadership guidance for infrastructure, scalability,
  and roadmap discussions.
- **`.github/agents/security.agent.md`** – Security engineering guidance for GraphQL, WebSocket, webapp, CI/CD, AWS IAM,
  and account/domain hardening.
- **`.github/prompts/*.prompt.md`** – Task/plan templates (the `plan-*` files) and aliases (`pr`, etc.). Open the
  relevant prompt before executing a plan to honor its assumptions.

When you encounter a request that aligns with a specific agent or prompt, cite the file name in your reasoning and
follow that file's instructions (e.g., start with the `'pr'` prompt above when generating PR materials, or review the
`plan-*` prompt for multi-step UI/UX work).
