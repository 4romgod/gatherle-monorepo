# Environment & Secrets Reference

## API (`apps/api`)

### Local development (Dev stage)
- Source: `.env` (e.g., `apps/api/.env.local` or root `.env` used with `dotenv` in `environmentVariables.ts`).
- Required keys:  
  - `STAGE` (default `Dev`).  
  - `AWS_REGION` (defaults to `eu-west-1`).  
  - `MONGO_DB_URL` & `JWT_SECRET` (used directly from the file).  
- `GRAPHQL_URL` defaults to `http://localhost:9000/v1/graphql`, so you no longer need to supply `API_DOMAIN`/`API_PORT` locally.  
- Change the dev server port via `PORT` if you need something other than 9000; the default URL will follow that port automatically.
- `NTLANGO_SECRET_ARN` is **not required** locally—dev never reads Secrets Manager.

### Deployed stages (Staging/Prod)
- Secrets Manager stores `MONGO_DB_URL` and `JWT_SECRET` inside a secret whose name follows `${STAGE}/ntlango/graphql-api`.  
- CDK injects these into the lambda by looking up that secret via `Secret.fromSecretNameV2` and supplying `NTLANGO_SECRET_ARN` (the actual ARN returned by Secrets Manager) and `AWS_REGION`.  
- Lambda environment:  
  - `STAGE` (from CI/CD).  
  - `NTLANGO_SECRET_ARN` (required ARN, not just the string `${STAGE}/ntlango/graphql-api`; the ARN is passed verbatim).  
  - `AWS_REGION` (should align with where the stack is deployed).  
  - `NODE_OPTIONS` (handled in CDK, no manual change).

### Integration tests (post-deploy)
- Run from CI/CD after deployment.  
- Required env: `STAGE`, `NTLANGO_SECRET_ARN`, `GRAPHQL_URL` (the URL exposed by CloudFormation).  
- These tests still expect to resolve `MONGO_DB_URL` and `JWT_SECRET` via the ARN, so the secret must be in place before the tests run.

## Webapp (`apps/webapp`)

### Local development
- Source: `apps/webapp/.env`.  
- Keys:  
  - `NEXT_PUBLIC_JWT_SECRET` (mirrors API secret for client-side helpers).  
  - `NEXT_PUBLIC_GRAPHQL_URL` (e.g., `http://localhost:9000/v1/graphql`).  
- These values stay local and are never checked in (respect `.gitignore` for `.env*`).

### Production & Staging
- Host or CI (e.g., Vercel) should inject `NEXT_PUBLIC_JWT_SECRET` and `NEXT_PUBLIC_GRAPHQL_URL`.  
- `NEXT_PUBLIC_GRAPHQL_URL` can come from the API deploy job output (`GRAPHQL_URL`).  
- `NEXT_PUBLIC_JWT_SECRET` should be sourced from the same Secrets Manager secret or another secure vault and exposed only to the frontend build pipeline.

## CI/CD (`.github/workflows/pipeline.yaml`)

- Secrets & vars needed in GitHub:  
  1. `ASSUME_ROLE_ARN` – secret, used when configuring AWS credentials.  
  2. `AWS_REGION` – can live in repository **variables** (no need to mark it as a secret).  
  3. `STAGE` – repository variable (default `Dev`, override for prod).  
  4. `NTLANGO_SECRET_ARN` – if tests or later steps run outside AWS, pass the ARN (or re-export it) so integration tests/webapp builds can reach the same secrets.  
- CDK deploy step passes:  
  - `STAGE` (via `vars.STAGE`).  
  - `AWS_REGION` (via props, default `eu-west-1`).  
  - `NTLANGO_SECRET_ARN` (the actual ARN from the secret).  
- After deployment:  
  - Capture `GRAPHQL_URL` output.  
  - Run integration tests with `STAGE`, `NTLANGO_SECRET_ARN`, `GRAPHQL_URL`.  
  - For the frontend deploy, surface `NEXT_PUBLIC_GRAPHQL_URL` (`GRAPHQL_URL`) plus `NEXT_PUBLIC_JWT_SECRET` (from the secret) using GitHub env/outputs without hardcoding.

## Next steps to keep things tidy
- Keep this file in sync with `AGENTS.md` so the team always knows where to look for environment rules.  
- Add an env validation script (or re-enable the commented `zod` schema in `environmentVariables.ts`) to force devs/CICD to satisfy the right keys per `STAGE`.  
- Update the pipeline to pass `NEXT_PUBLIC_*` values securely instead of the placeholder `secret`; consider introducing a small job that writes those values to `${GITHUB_ENV}` after API deployment.  
- Propagate the `NTLANGO_SECRET_ARN` ARN (not just the secret name) everywhere the API runs so the lambda and tests can actually resolve the secret.
