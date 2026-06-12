# Environment & Secrets Reference

For end-to-end account/bootstrap instructions, see `docs/runbooks/aws-account-setup.md`.

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
  - `S3_BUCKET_NAME` (optional for local dev; required when using media upload functionality).
  - `MEDIA_CDN_DOMAIN` (required when using media upload functionality; uploaded media URLs are always canonical CDN
    URLs and the API no longer falls back to expiring presigned read URLs).
  - `CORS_ALLOWED_ORIGINS` (optional comma-separated extra `http(s)` origins only; use this for preview domains or
    non-default local origins. `*` is rejected).
  - `EMAIL_FROM` (defaults to `noreply@gatherle.com`; sender address for transactional emails).
  - `WEBAPP_URL` (defaults to `http://localhost:3000`; used by the API EmailService to build email verification and
    password reset links in dev).
  - `GOOGLE_OAUTH_CLIENT_ID_WEB` (required to verify web Google OAuth identity tokens in the API).
  - `GOOGLE_OAUTH_CLIENT_ID_ANDROID` (required when testing Android mobile Google sign-in against the local API).
  - `GOOGLE_OAUTH_CLIENT_ID_IOS` (required when testing iOS mobile Google sign-in against the local API).
  - `FIREBASE_FCM_SERVICE_ACCOUNT_PATH` (optional; absolute or repo-relative path to the Firebase service-account JSON
    used for direct Android FCM delivery from the API in local dev).
  - `FIREBASE_FCM_SERVICE_ACCOUNT_JSON` (optional alternative to `_PATH`; raw single-line JSON string for the same
    Firebase service-account credential. This can live in `apps/api/.env.local` because that file is gitignored.
    `jq -c . /secure/path/firebase-admin.json` is the easiest way to produce the value.)
  - Apple OAuth verification uses fixed Apple client identifiers in code: `com.gatherle.web` for web/browser flows and
    `com.gatherle.mobile` for native iOS. No separate API env vars are required for Apple client IDs.
  - Legacy `APPLE_CLIENT_ID` has no env-var replacement for the API and is no longer read; remove it from local env
    files instead of renaming it.
- `GRAPHQL_URL` defaults to `http://localhost:9000/v1/graphql`, so you no longer need to supply `API_DOMAIN`/`API_PORT`
  locally.
- Change the dev server port via `PORT` if you need something other than 9000; the default URL will follow that port
  automatically.
- `SECRET_ARN` is **not required** locally—dev never reads Secrets Manager.

### Deployed stages (Staging/Prod)

- Secrets Manager stores `MONGO_DB_URL`, `JWT_SECRET`, and optionally `FIREBASE_FCM_SERVICE_ACCOUNT_JSON` inside a
  secret whose name follows `gatherle/backend/${STAGE.toLowerCase()}-${AWS_REGION.toLowerCase()}` (for example
  `gatherle/backend/beta-eu-west-1`).
- CDK injects these into the lambda by looking up that secret via `Secret.fromSecretNameV2` and supplying `SECRET_ARN`
  (the actual ARN returned by Secrets Manager) and `AWS_REGION`.
- Lambda environment:
  - `STAGE` (from CI/CD).
  - `SECRET_ARN` (required ARN, not just the string
    `gatherle/backend/${STAGE.toLowerCase()}-${AWS_REGION.toLowerCase()}`; the ARN is passed verbatim).
  - `AWS_REGION` (should align with where the stack is deployed).
  - `S3_BUCKET_NAME` (S3 bucket for media storage; must be configured in deployment environment).
  - `MEDIA_CDN_DOMAIN` (required; injected by CDK from the CloudFront distribution fronting the media bucket. The API
    uses this to return stable media URLs and will reject media-upload URL requests if it is missing).
  - `CORS_ALLOWED_ORIGINS` (optional comma-separated extra `http(s)` origins merged with the stage-default webapp
    allowlist. `*` is rejected).
  - `EMAIL_FROM` (verified SES sender address, e.g. `noreply@gatherle.com`; must be SES-verified in the deployment
    region).
  - `WEBAPP_URL` (public webapp URL, e.g. `https://app.gatherle.com`; used by the API EmailService to build email
    verification and password reset links).
  - `GOOGLE_OAUTH_CLIENT_ID_WEB` (required when Google sign-in is enabled on the webapp; the API validates Google
    `id_token` audience against this value).
  - `GOOGLE_OAUTH_CLIENT_ID_ANDROID` (required when Android mobile Google sign-in is enabled; the API accepts this
    audience too).
  - `GOOGLE_OAUTH_CLIENT_ID_IOS` (optional until iOS mobile Google sign-in is enabled; when set, the API accepts this
    audience too).
  - `FIREBASE_FCM_SERVICE_ACCOUNT_JSON` (optional until direct Android FCM delivery is enabled in the target
    environment; when present in the backend Secrets Manager secret, the API sends Android push notifications directly
    to Firebase instead of Expo).
  - `FIREBASE_FCM_SERVICE_ACCOUNT_PATH` is mainly for local/server-based environments and is usually unnecessary in
    Lambda, where the raw JSON env var or a future Secrets Manager entry is the better fit.
  - Apple OAuth verification uses fixed Apple client identifiers in code: `com.gatherle.web` for web/browser flows and
    `com.gatherle.mobile` for native iOS. No deployed API env vars are required for Apple client IDs.
  - Legacy `APPLE_CLIENT_ID` has no deployed env-var replacement for the API and is no longer read; do not add it to
    Secrets Manager, Lambda configuration, or GitHub environment vars.
  - `NODE_OPTIONS` (handled in CDK, no manual change).

### E2E tests

E2E tests use the `STAGE` environment variable to determine which endpoint to test against.

#### Local testing (STAGE=Dev, default)

- Run: `npm run test:e2e -w @gatherle/api`
- Requires: `MONGO_DB_URL`, `JWT_SECRET`, `STAGE=Dev`
- Behavior: Spins up local server at `http://localhost:9000/v1/graphql`, runs tests, cleans up test data automatically

#### Remote testing (STAGE=Beta or STAGE=Prod)

- Run: `STAGE=Beta GRAPHQL_URL=<endpoint> npm run test:e2e -w @gatherle/api`
- Required env: `STAGE`, `GRAPHQL_URL`, `SECRET_ARN`, `AWS_REGION`
- Behavior: Tests against deployed endpoint without starting a server, skips automatic cleanup
- Example: Post-deployment tests in CI/CD run against the freshly deployed API endpoint with `STAGE=Beta`

## Webapp (`apps/webapp`)

### Local development

- Source: `apps/webapp/.env`.
- Keys:
  - `NEXTAUTH_SECRET` (server-side NextAuth session signing secret; must be distinct from API `JWT_SECRET`).
  - `NEXT_PUBLIC_GRAPHQL_URL` (e.g., `http://localhost:9000/v1/graphql`).
  - `NEXT_PUBLIC_WEBSOCKET_URL` (optional override for realtime notifications/chat. When omitted, the webapp only
    auto-derives a websocket base URL in two supported cases: local `http://localhost:9000/v1/graphql` ->
    `ws://localhost:9000/local`, and canonical Gatherle deployed GraphQL hosts shaped like `https://api.../graphql` ->
    `wss://ws...`. If your deployed GraphQL URL uses any other remote host, including an `execute-api` hostname, set
    `NEXT_PUBLIC_WEBSOCKET_URL` explicitly.)
  - `NEXT_PUBLIC_ENABLE_PRIVATE_USERS` (optional feature flag; set to `true` to expose private-user privacy controls and
    follow-request review flows. Defaults to disabled, so frontend users are treated as public).
  - `GOOGLE_OAUTH_CLIENT_ID_WEB` / `GOOGLE_OAUTH_CLIENT_SECRET_WEB` (required for Google OAuth in NextAuth).
  - `APPLE_OAUTH_CLIENT_SECRET_WEB` (required for Apple OAuth in NextAuth; the web client ID is fixed in code as
    `com.gatherle.web`).
  - Generate `APPLE_OAUTH_CLIENT_SECRET_WEB` from the downloaded Apple `.p8` key with
    `npm run apple:oauth:client-secret -w @gatherle/webapp -- --key-file /secure/path/AuthKey_XXXXXXXXXX.p8 --team-id <APPLE_TEAM_ID> --key-id <APPLE_KEY_ID>`.
  - `NEXT_DEV_ALLOWED_ORIGINS` (optional; comma-separated hostnames/IPs to allow cross-origin `/_next/*` requests in dev
    mode, e.g. `192.168.0.7` for LAN testing from a phone). Not needed for standard `localhost` development.
  - `MEDIA_UPLOAD_S3_URL` — required when testing media uploads locally. Point at the Beta bucket:
    `https://gatherle-media-beta-af-south-1.s3.af-south-1.amazonaws.com`. Also set `S3_BUCKET_NAME` and
    `CORS_ALLOWED_ORIGINS=http://localhost:3000` in `apps/api/.env.local`. See
    `docs/frontend/media-upload-architecture.md` for full local setup. This is build-time only and is used by
    `apps/webapp/next.config.mjs` to allow presigned browser `PUT` uploads in the CSP. In CI/CD it is derived
    automatically from the `S3BucketStack` CloudFormation output.
  - `NEXT_PUBLIC_MEDIA_CDN_URL` — optional in local development and preview/beta paths. When omitted, the webapp CSP
    falls back to `MEDIA_UPLOAD_S3_URL` for `connect-src` / `media-src` so remote media previews still load.
- These values stay local and are never checked in (respect `.gitignore` for `.env*`).

### Production & Staging

- Host or CI (e.g., Vercel) should inject `NEXTAUTH_SECRET` and `NEXT_PUBLIC_GRAPHQL_URL`.
- `NEXT_PUBLIC_WEBSOCKET_URL` is optional in deployed environments only when `NEXT_PUBLIC_GRAPHQL_URL` uses the
  canonical Gatherle `api.*` host pattern. If the deployed GraphQL URL uses any other remote host, inject
  `NEXT_PUBLIC_WEBSOCKET_URL` explicitly.
- Set `NEXT_PUBLIC_ENABLE_PRIVATE_USERS=true` only when the private-user product surface is ready for users.
- Inject `GOOGLE_OAUTH_CLIENT_ID_WEB` / `GOOGLE_OAUTH_CLIENT_SECRET_WEB` when Google sign-in is enabled.
- Inject `APPLE_OAUTH_CLIENT_SECRET_WEB` when Apple sign-in is enabled.
- `NEXT_PUBLIC_GRAPHQL_URL` can come from the API deploy job output (`GRAPHQL_URL`).
- `MEDIA_UPLOAD_S3_URL` is only needed at build time for direct browser uploads and local upload testing; persisted
  media reads come back from the API as stable CloudFront URLs in deployed environments.
- `NEXT_PUBLIC_MEDIA_CDN_URL` should be set for deployed environments that serve media from CloudFront; if it is
  temporarily absent, the webapp now falls back to `MEDIA_UPLOAD_S3_URL` instead of blocking remote media.
- `NEXTAUTH_SECRET` should come from a secure vault and must not reuse the API signing secret (`JWT_SECRET`).

- Custom domain attachment for webapp hostnames (for example `beta.gatherle.com`, `www.beta.gatherle.com`) is managed in
  Vercel + Route53 DNS records in the DNS account. Follow `docs/runbooks/aws-account-setup.md` section
  `D. Connect webapp domain in Vercel`.

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

## Mobile (`apps/mobile`)

### Local development

- Source: `apps/mobile/.env`.
- Keys:
  - `EXPO_PUBLIC_GRAPHQL_URL` (e.g., `http://10.0.2.2:9000/v1/graphql` for Android emulator or
    `http://localhost:9000/v1/graphql` when using `adb reverse`).
  - `EXPO_PUBLIC_WEBSOCKET_URL` (local or deployed websocket endpoint for realtime notifications and chat).
  - `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB` (required for native mobile Google sign-in runtime on Android and iOS).
  - `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS` (required for iOS native Google sign-in so the Google Sign-In plugin can
    register the reverse-client-ID URL scheme).
  - `EXPO_PUBLIC_WEBAPP_URL` (recommended when testing Apple sign-in on Android; set this to a real HTTPS Gatherle host
    whose Apple Services ID return URL includes `/auth/mobile/apple/callback`, for example `https://beta.gatherle.com`.
    Defaults to `https://gatherle.com` if omitted.)
  - `EXPO_PUBLIC_ENABLE_PRIVATE_USERS` (optional feature flag; set to `true` to expose private-user privacy controls and
    follow-request review flows. Defaults to disabled, so frontend users are treated as public).
  - Android Firebase config for native push:
    - local dev / local APK: place `google-services.json` at `apps/mobile/google-services.json` (gitignored), or set
      `EXPO_ANDROID_GOOGLE_SERVICES_FILE` to another file path before running `npm run android` / `npm run apk:release`
    - GitHub CI APK builds: set `ANDROID_GOOGLE_SERVICES_JSON_BASE64` or `ANDROID_GOOGLE_SERVICES_JSON`
    - EAS Android preview/production builds: upload the same file as an EAS file env var named `GOOGLE_SERVICES_JSON`
      and the app config will use that path automatically during the remote build
  - iOS native push in the current implementation does not use a Firebase client config file. It uses Expo push tokens,
    so the app-side requirement is an EAS-built iOS app with APNs credentials configured for `com.gatherle.mobile`.
  - Remote iOS push testing requires a physical iPhone. The iOS Simulator can run the app, but it is not the target for
    remote push verification.

### Production & Staging

- Inject `EXPO_PUBLIC_GRAPHQL_URL` and `EXPO_PUBLIC_WEBSOCKET_URL` from the deployed API/WebSocket outputs.
- Inject `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB` for Android and iOS builds.
- Inject `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS` for iOS builds.
- Inject `EXPO_PUBLIC_WEBAPP_URL` for Android/iOS builds when Apple sign-in should use a non-production HTTPS web host
  such as `https://beta.gatherle.com`.
- For Android native push, use one shared `google-services.json` across local dev builds, EAS preview/production builds,
  and GitHub CI release APK builds:
  - local: `apps/mobile/google-services.json` or `EXPO_ANDROID_GOOGLE_SERVICES_FILE`
  - EAS: file env var `GOOGLE_SERVICES_JSON`
  - GitHub Actions: secret `ANDROID_GOOGLE_SERVICES_JSON_BASE64` (or raw `ANDROID_GOOGLE_SERVICES_JSON`)
- Configure Expo EAS environments (`development`, `preview`, `production`) with the required `EXPO_PUBLIC_GOOGLE_*`
  values so remote EAS builds inline the correct client IDs.
- Configure iOS push credentials in EAS for `com.gatherle.mobile` so Expo can hand iOS notifications off to APNs for
  development, preview, and production builds.
- Native iOS Apple sign-in does not use a public Expo client ID env var. The app uses the bundle ID
  `com.gatherle.mobile`, and the API accepts that audience in addition to the fixed Apple Services ID `com.gatherle.web`
  used by web and Android browser flows.
- Register the Android OAuth client in Google Cloud Console with package `com.gatherle.mobile` and the SHA1 for the
  signing identity used by the installed build. The repo-managed local build path now shares one keystore between
  `npm run android` and `npm run apk:release`; from `apps/mobile`, run `npm run android:oauth:doctor` to print that
  shared SHA1 and any fallback debug-only fingerprint if you bypass the repo script.
- Set `EXPO_PUBLIC_ENABLE_PRIVATE_USERS=true` only when the private-user product surface is ready for users.

## CI/CD (`.github/workflows/deploy-trigger.yaml` + reusable deploy workflows)

- CDK target resolution uses the nested map in `infrastructure/cdk/lib/constants/accounts.ts`:
  `stage -> region -> account`.
- `.github/workflows/deploy-trigger.yaml` is the orchestrator:
  - Triggered on pushes to `main`.
  - Calls DNS deploy first using the region matrix defined in the workflow file.
  - Calls runtime deploy for `Beta` after DNS succeeds.
  - Calls deploy for `Prod` only after Beta succeeds and Prod deploy is enabled.
- `.github/workflows/deploy-dns.yaml` is reusable (`workflow_call`) and deploys `DnsStack` for a single region.
- `.github/workflows/deploy.yaml` is reusable (`workflow_call`) and deploys a single target from `stage` + `region`.
- The deploy workflow derives GitHub Environment name as `<stage-lower>-<region>` (for example `beta-eu-west-1`).
- The deploy workflow supports optional `web_domain_alias`; when provided by the caller, it aliases the successful
  Vercel deployment to that domain and performs a basic HTTPS reachability check.
- DNS deploy derives GitHub Environment name as `dns-<region>` (for example `dns-af-south-1`).
- Create one GitHub **Environment** per target (for example `dns-af-south-1`, `beta-af-south-1`, `prod-af-south-1`) so
  each target has isolated secrets/approvals.
- For the step-by-step GitHub setup procedure, use
  [docs/runbooks/github-actions-variables-and-secrets.md](./runbooks/github-actions-variables-and-secrets.md).
- PR security now has dedicated workflows:
  - `.github/workflows/security-check.yaml`
  - `.github/workflows/codeql.yaml`

### GitHub Environment Secrets (sensitive, stage-specific)

- `GATHERLE_TEST_ADMIN_PASSWORD` (required for API e2e jobs; must match the password used when seeding
  `test-admin@gatherle.com`).
- `GATHERLE_TEST_USER_PASSWORD` (required for API e2e jobs; must match the password used when seeding
  `test-user@gatherle.com`).
- `GATHERLE_TEST_USER2_PASSWORD` (required for API e2e jobs; must match the password used when seeding
  `test-user2@gatherle.com`).
- `JWT_SECRET` (required for API e2e jobs; should match the backend signing secret used for that stage).
- `NEXTAUTH_SECRET` (used by NextAuth session signing in the webapp deployment environment).
- `SECRET_ARN` is resolved dynamically in CI/CD from Secrets Manager using `STAGE` + `AWS_REGION`, so you do not need to
  store it in GitHub variables.

### GitHub Environment Variables (non-sensitive, per-environment)

- GitHub Environments do not inherit from one another. A `global` GitHub Environment is not consumed automatically by
  `beta-af-south-1`, `prod-af-south-1`, or `dns-af-south-1`; shared values must be stored as repository
  secrets/variables instead.
- `ASSUME_ROLE_ARN` (required): IAM role ARN for `configure-aws-credentials` in the matching environment target. This is
  an identifier, not a credential, so it is now stored as an environment variable.
- `ALERT_EMAIL_RECIPIENTS` (recommended for beta/prod; comma-separated email addresses that should receive
  CloudWatch-alarm notifications via the monitoring stack SNS topic. Example:
  `alerts@gatherle.com,founder@gatherle.com`. Each subscription requires a one-time confirmation from the recipient
  inbox after deploy.)
- `ENABLE_CUSTOM_DOMAINS` (recommended per stage; set `false` before NS delegation and `true` after custom-domain wiring
  is ready for that environment).
- `EMAIL_FROM` (optional; defaults to `noreply@gatherle.com`; must match a verified SES identity in the deployment
  account/region).
- `WEBAPP_URL` (required for email links to work; set to the public webapp URL for the environment, e.g.
  `https://beta.gatherle.com`). If not set, CDK synth/deploy will still succeed, but email verification and similar
  links generated by the API will be broken (they will contain an empty or invalid base URL). These variables are read
  by CDK at synth time. `ALERT_EMAIL_RECIPIENTS` configures the monitoring stack, while `EMAIL_FROM` and `WEBAPP_URL`
  are injected into the GraphQL Lambda environment. `WEBAPP_URL` is also passed into the CI Android release build as
  `EXPO_PUBLIC_WEBAPP_URL` so Apple mobile sign-in uses the stage-correct callback host.
- `STAGE` / `AWS_REGION` GitHub environment variables are not required by the deploy workflows and can be removed; the
  workflows derive those values from workflow inputs.

### GitHub Repository Secrets (sensitive, shared across stages)

- `VERCEL_TOKEN` (required if web deploy is enabled).
- `GOOGLE_OAUTH_CLIENT_ID_WEB` / `GOOGLE_OAUTH_CLIENT_SECRET_WEB` (required for web Google OAuth when shared across
  stages; the API also uses the web client ID to verify Google `id_token` audiences).
- `APPLE_OAUTH_CLIENT_SECRET_WEB` (required for web Apple OAuth in NextAuth when shared across stages; the Apple web
  client ID is fixed in code as `com.gatherle.web` and the API verifies Apple `id_token` audiences against that
  constant).
- There is no GitHub secret or variable replacement for legacy `APPLE_CLIENT_ID`; the Apple web client ID is fixed in
  code, so only `APPLE_OAUTH_CLIENT_SECRET_WEB` needs to be configured for Apple web OAuth.
- `APPLE_OAUTH_CLIENT_SECRET_WEB` is a signed JWT generated from your Apple Sign in with Apple `.p8` key, `Team ID`,
  `Key ID`, and Services ID; rotate it before it expires.
- `ANDROID_RELEASE_KEYSTORE_BASE64` (required for the GitHub Actions Android APK build; base64-encoded contents of the
  release `.jks` file).
- `ANDROID_RELEASE_KEYSTORE_PASSWORD` (required for the GitHub Actions Android APK build).
- `ANDROID_RELEASE_KEY_ALIAS` (required for the GitHub Actions Android APK build).
- `ANDROID_RELEASE_KEY_PASSWORD` (required for the GitHub Actions Android APK build).
- `ANDROID_GOOGLE_SERVICES_JSON_BASE64` (required for the GitHub Actions Android APK build once native Android push is
  enabled; base64-encoded `google-services.json` used by Firebase/FCM).

### GitHub Repository Variables (non-sensitive, shared across stages)

- `ENABLE_PROD_DEPLOY` (optional, `true` or `false`, default `false`).
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` (shared Vercel team/project identifiers used by the deploy workflow).
- `GOOGLE_OAUTH_CLIENT_ID_ANDROID` (required when building the Android mobile release in CI/CD and for API verification
  of Android Google `id_token` audiences).
- `GOOGLE_OAUTH_CLIENT_ID_IOS` (required once iOS mobile Google sign-in is enabled and for API verification of iOS
  Google `id_token` audiences).
- `GRAPHQL_API_THROTTLE_RATE_LIMIT` (optional; overrides the default API Gateway stage steady-state rate limit in req/s
  for the GraphQL API; must be a positive integer; defaults per stage are defined in
  `infrastructure/cdk/lib/constants/graphql-api-security.ts`).
- `GRAPHQL_API_THROTTLE_BURST_LIMIT` (optional; overrides the default API Gateway stage burst limit for the GraphQL API;
  must be a positive integer; defaults per stage are defined in
  `infrastructure/cdk/lib/constants/graphql-api-security.ts`).
- `GRAPHQL_API_WAF_RATE_LIMIT` (optional; overrides the default WAF rate-based rule limit (requests per 5-minute window
  per IP) for the GraphQL API; must be an integer ≥ 100; defaults per stage are defined in
  `infrastructure/cdk/lib/constants/graphql-api-security.ts`).
- The `GRAPHQL_API_*` overrides are read directly from `process.env` during CDK synth. They are not currently passed
  through by the GitHub deploy workflows, so setting them only as GitHub repository variables will not affect CI/CD
  deploys until the workflow is explicitly wired to export them.
- Regions are configured directly in `.github/workflows/deploy-trigger.yaml` matrix entries (for example
  `region: [eu-west-1, us-east-1]`).
- `SECRET_ARN` is not required as a GitHub variable when using dynamic resolution.
- `STAGE` / `AWS_REGION` repository variables are not required for deployment targeting.

### DNS Environment Variables

- `ASSUME_ROLE_ARN` (required): IAM role ARN for the DNS deploy environment.
- `DELEGATED_SUBDOMAINS` (optional until delegation is enabled): JSON array of `{ subdomain, nameServers[] }` objects
  used by `.github/workflows/deploy-dns.yaml`.

### Post-deploy wiring

- Capture `GRAPHQL_URL` from `gatherle-graphql-<stage-lower>-<region>` stack output `apiPath`.
- Capture `WEBSOCKET_URL` from `gatherle-websocket-api-<stage-lower>-<region>` output `websocketApiUrl`.
- Capture `OPERATIONAL_ALERTS_TOPIC_ARN` from `gatherle-monitoring-dashboard-<stage-lower>-<region>` output
  `OperationalAlertsTopicArn`.
- Capture `STAGE_HOSTED_ZONE_NAME_SERVERS` from `gatherle-graphql-<stage-lower>-<region>` output
  `stageHostedZoneNameServers` when preparing DNS delegation.
- Run API e2e tests with `STAGE`, `AWS_REGION`, `GRAPHQL_URL`, and `SECRET_ARN`.
- API e2e jobs also require the seeded test-user passwords to be present as GitHub Environment secrets:
  `GATHERLE_TEST_ADMIN_PASSWORD`, `GATHERLE_TEST_USER_PASSWORD`, and `GATHERLE_TEST_USER2_PASSWORD`.
- Pass `NEXT_PUBLIC_GRAPHQL_URL` and `NEXT_PUBLIC_WEBSOCKET_URL` to frontend deployment.
- For first custom-domain rollout:
  1. Deploy runtime with `ENABLE_CUSTOM_DOMAINS=false` to create stage hosted zone.
  2. Capture `GraphQLStack` output `stageHostedZoneNameServers`.
  3. Populate DNS env var `DELEGATED_SUBDOMAINS` and deploy `DnsStack`.
  4. Set `ENABLE_CUSTOM_DOMAINS=true` and redeploy runtime.

### Manual Auth Bootstrap (one-time per AWS account)

`GitHubAuthStack` (from `npm run cdk:github-auth`) creates the IAM OIDC provider and the matching environment-specific
deploy role that CI/CD later assumes.  
Because this role does not exist on day one, bootstrap it manually with admin AWS credentials:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=327319899143 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively
```

For the Prod runtime account:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=969849535023 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively
```

Then capture the created role ARN and store the environment-specific value as GitHub Environment secret
`ASSUME_ROLE_ARN`:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
STAGE=Beta AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-327319899143 \
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionBetaDeployRoleArn'].OutputValue" \
  --output text
```

Use the matching output key per environment:

- `beta-<region>` -> `GithubActionBetaDeployRoleArn`
- `prod-<region>` -> `GithubActionProdDeployRoleArn`
- `dns-<region>` -> `GithubActionDnsDeployRoleArn`

For stage-dedicated runtime accounts, each account emits only its own runtime role output:

- Beta account -> `GithubActionBetaDeployRoleArn`
- Prod account -> `GithubActionProdDeployRoleArn`

### Manual Secrets Bootstrap / Rotation (intentional only)

- Runtime deployment intentionally excludes `SecretsManagementStack`.
- The main runtime CDK app now only instantiates `SecretsManagementStack` when both `MONGO_DB_URL` and `JWT_SECRET` are
  provided, so routine synth/deploy flows do not accidentally stage blank secret values.
- Bootstrap or rotate backend secret values manually. `FIREBASE_FCM_SERVICE_ACCOUNT_JSON` is optional and can be added
  at the same time when Android direct FCM delivery should be enabled:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
STAGE=Beta AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' FIREBASE_FCM_SERVICE_ACCOUNT_JSON="$(jq -c . /secure/path/firebase-admin.json)" npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively
```

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
STAGE=Prod AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' FIREBASE_FCM_SERVICE_ACCOUNT_JSON="$(jq -c . /secure/path/firebase-admin.json)" npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively
```

- Verify secret ARN:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
aws secretsmanager describe-secret \
  --secret-id gatherle/backend/beta-af-south-1 \
  --query "ARN" \
  --output text
```

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
aws secretsmanager describe-secret \
  --secret-id gatherle/backend/prod-af-south-1 \
  --query "ARN" \
  --output text
```

- Dedicated app for this step: `infrastructure/cdk/lib/secrets-app.ts`.

## AWS Org Account Split (DNS + Beta + Prod)

- Recommended account ownership:
  - `Gatherle-dns` account owns root public hosted zone `gatherle.com`.
  - `Gatherle-beta` account owns runtime stacks and stage subdomains.
  - `Gatherle-prod` account owns production runtime stacks and stage subdomains.
- Current beta deployment account configured in code:
  - `infrastructure/cdk/lib/constants/accounts.ts` maps `Beta + af-south-1` to account `327319899143`.
- Current prod deployment account configured in code:
  - `infrastructure/cdk/lib/constants/accounts.ts` maps `Prod + af-south-1` to account `969849535023`.
- Deployment bootstrap sequence:
  1. In `Gatherle-beta` account: run CDK bootstrap for `af-south-1`.
  2. In `Gatherle-prod` account: run CDK bootstrap for `af-south-1`.
  3. In each runtime account: deploy `GitHubAuthStack` once and store the environment-specific role ARN in GitHub
     environment secrets.
  4. In `Gatherle-dns` account: create/host `gatherle.com`.
  5. Delegate stage subdomain NS records to the beta/prod account hosted zones when API custom domains are introduced.

### DNS Bootstrap (`Gatherle-dns` account)

Deploy root hosted-zone stack from DNS account credentials:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively
```

Then retrieve registrar name servers:

```bash
cd /home/bigfish/code/projects/gatherle-monorepo
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-dns-root-zone-072092344224 \
  --query "Stacks[0].Outputs[?OutputKey=='RootHostedZoneNameServers'].OutputValue" \
  --output text
```

## Next steps to keep things tidy

- Keep this file in sync with `AGENTS.md` so the team always knows where to look for environment rules.
- Add an env validation script (or re-enable the commented `zod` schema in `environmentVariables.ts`) to force devs/CICD
  to satisfy the right keys per `STAGE`.
- Update the pipeline to pass `NEXT_PUBLIC_*` values securely instead of the placeholder `secret`; consider introducing
  a small job that writes those values to `${GITHUB_ENV}` after API deployment.
- Propagate the `SECRET_ARN` ARN (not just the secret name) everywhere the API runs so the lambda and tests can actually
  resolve the secret.
