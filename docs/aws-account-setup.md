# AWS Account Setup Runbook (Manual Bootstrap + CI/CD Deploy)

This runbook reflects the intended operating model:

1. Bootstrap every account+region manually.
2. Deploy `GitHubAuthStack` manually in every account CI/CD will touch.
3. Prefer CI/CD for ongoing service and DNS stack deployments (manual deploy is optional for break-glass or first-time
   setup).

All commands below assume repository root: `/home/bigfish/code/projects/gatherle-monorepo`.

## Current account mapping

- `Gatherle-dns` account ID: `072092344224`
- `Gatherle-beta` account ID: `327319899143`
- Active region in config: `af-south-1`
- Root domain: `gatherle.com`

## 1. Create AWS CLI profiles

Preferred: AWS SSO / IAM Identity Center.

```bash
aws configure sso --profile gatherle-dns
aws configure sso --profile gatherle-beta
```

```bash
aws sso login --profile gatherle-dns
aws sso login --profile gatherle-beta
aws sts get-caller-identity --profile gatherle-dns
aws sts get-caller-identity --profile gatherle-beta
```

Expected:

- `gatherle-dns` -> `072092344224`
- `gatherle-beta` -> `327319899143`

## 2. Bootstrap `CDKToolkit` manually for every account+region

Run this for every target account and region before any deploy.

DNS account (`Gatherle-dns`):

```bash
AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- bootstrap aws://072092344224/af-south-1 --profile gatherle-dns
```

Beta account (`Gatherle-beta`):

```bash
STAGE=Beta AWS_REGION=af-south-1 npm run cdk -w @gatherle/cdk -- bootstrap aws://327319899143/af-south-1 --profile gatherle-beta
```

Verify:

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --region af-south-1 --profile gatherle-dns
aws cloudformation describe-stacks --stack-name CDKToolkit --region af-south-1 --profile gatherle-beta
```

## 3. Deploy `GitHubAuthStack` manually in every CI target account

Do this once per account that GitHub Actions needs to assume into.

Beta account (`Gatherle-beta`):

```bash
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=327319899143 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively --profile gatherle-beta
```

Read role ARN (Beta):

```bash
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-327319899143 \
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionOidcIamRoleArn'].OutputValue" \
  --output text \
  --profile gatherle-beta
```

DNS account (`Gatherle-dns`) for DNS CI/CD:

```bash
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=072092344224 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively --profile gatherle-dns
```

Read role ARN (DNS):

```bash
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-072092344224 \
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionOidcIamRoleArn'].OutputValue" \
  --output text \
  --profile gatherle-dns
```

Set each ARN into the matching GitHub Environment secret `ASSUME_ROLE_ARN`.

## 4. Configure GitHub environments and secrets

Create one GitHub Environment per target name used by deploy workflow:

- `dns-af-south-1`
- `beta-af-south-1`
- `prod-af-south-1` (when enabled)

Set environment secrets:

- `ASSUME_ROLE_ARN` (from `GitHubAuthStack` output for that target account; DNS workflows must use DNS account ARN)
- `NEXTAUTH_SECRET` (webapp session signing secret; keep distinct from backend `JWT_SECRET` in Secrets Manager)
- `VERCEL_TOKEN` (if web deploy enabled)
- `VERCEL_ORG_ID` (if web deploy enabled)
- `VERCEL_PROJECT_ID` (if web deploy enabled)

Repository variable:

- `ENABLE_PROD_DEPLOY`
- `ENABLE_CUSTOM_DOMAINS` (`false` for first rollout, then `true` after NS delegation)

DNS environment variables (set in `dns-<region>` GitHub Environment when delegating a subdomain):

- `DELEGATED_SUBDOMAIN` (example: `beta.af-south-1`)
- `DELEGATED_NAME_SERVERS` (comma-separated name servers from `GraphQLStack` output `stageHostedZoneNameServers`)

## DNS setup (root + stage delegation)

This is the DNS model used by this repo:

- Root zone `gatherle.com` is hosted in `Gatherle-dns` account.
- Stage zone `beta.af-south-1.gatherle.com` is hosted in runtime account (`Gatherle-beta`) by `GraphQLStack`.
- Root zone delegates to stage zone via an `NS` record created by `DnsStack` when delegation variables are provided.

### A. Root domain delegation (registrar -> Route53 root zone)

1. Deploy DNS stack in DNS account (creates root hosted zone):

```bash
AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively --profile gatherle-dns
```

2. Get Route53 root NS values:

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-dns-root-zone-072092344224 \
  --query "Stacks[0].Outputs[?OutputKey=='RootHostedZoneNameServers'].OutputValue" \
  --output text \
  --profile gatherle-dns
```

3. In GoDaddy, set domain nameservers to those Route53 NS values.
4. Verify:

```bash
dig +short NS gatherle.com
```

### B. Stage subdomain delegation (root zone -> stage zone)

1. Run runtime deploy once with `ENABLE_CUSTOM_DOMAINS=false` so `GraphQLStack` creates stage hosted zone and outputs
   `stageHostedZoneNameServers`.
2. Copy `stageHostedZoneNameServers` (also surfaced by deploy workflow output `STAGE_HOSTED_ZONE_NAME_SERVERS`).
3. In GitHub Environment `dns-af-south-1`, set:
   - `DELEGATED_SUBDOMAIN=beta.af-south-1`
   - `DELEGATED_NAME_SERVERS=<comma-separated from step 2>`
4. Deploy DNS stack (CI/CD or manual). This creates root-zone NS record for `beta.af-south-1`.
5. Verify:

```bash
dig +short NS beta.af-south-1.gatherle.com
```

### C. Enable API/WS custom domains

1. Set `ENABLE_CUSTOM_DOMAINS=true` in `beta-af-south-1` environment variables.
2. Redeploy runtime stacks.
3. Verify:

```bash
dig +short api.beta.af-south-1.gatherle.com
dig +short ws.beta.af-south-1.gatherle.com
```

### D. Connect webapp domain in Vercel (manual, once per hostname)

This project currently deploys webapp builds to Vercel preview URLs from CI/CD.  
Custom hostnames must be attached in Vercel and mapped in Route53 (DNS account).

Recommended hostnames:

- `beta.gatherle.com` (primary beta web hostname)
- `www.beta.gatherle.com` (optional alias that redirects to `beta.gatherle.com`)

1. In Vercel project settings (or CLI), add the domain:

```bash
vercel domains add beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
vercel domains add www.beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
```

2. In Route53 hosted zone `gatherle.com` (DNS account), create records using the exact targets Vercel shows:

- `beta.gatherle.com` -> `CNAME` -> `<vercel target for beta>`
- `www.beta.gatherle.com` -> `CNAME` -> `beta.gatherle.com` (or Vercel-provided target)

3. Point a deployment to the hostname (optional if Vercel already auto-assigned):

```bash
vercel alias set <deployment-url> beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
```

Note: on `main` deployments to `Beta`, `.github/workflows/deploy.yaml` now performs this alias step automatically. This
is controlled by the caller workflow via `web_domain_alias` input, so reusable deploy logic stays stage-agnostic.

4. In Vercel, set canonical redirect:

- Redirect `www.beta.gatherle.com` -> `beta.gatherle.com`.

5. Verify DNS propagation and Vercel status:

```bash
dig +short beta.gatherle.com CNAME
dig +short www.beta.gatherle.com CNAME
```

- In Vercel Domains page, both hostnames should show valid configuration.
- If not, click `Refresh` after DNS propagation.

## 5. Manual backend secret bootstrap / rotation

Use this when bootstrapping a new stage+region secret or intentionally rotating backend secret values.

```bash
STAGE=Beta AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively --profile gatherle-beta
```

Verify:

```bash
aws secretsmanager describe-secret \
  --secret-id gatherle/backend/beta-af-south-1 \
  --query "ARN" \
  --output text \
  --profile gatherle-beta
```

Important:

- Runtime deploy workflow intentionally excludes `SecretsManagementStack`.
- Keep secret value changes intentional and manual.
- The dedicated app for this step is `infra/lib/secrets-app.ts`.

This step must be completed before runtime service stack deployment.

## 6. Deploy stacks (CI/CD preferred)

Preferred:

- Let `.github/workflows/deploy-trigger.yaml` orchestrate DNS and runtime deploys.
- `.github/workflows/deploy-dns.yaml` deploys `DnsStack` using `dns-<region>` environment (for example
  `dns-af-south-1`).
- `.github/workflows/deploy.yaml` deploys runtime stacks using `<stage-lower>-<region>` environments.

Recommended first rollout order for custom domains:

1. Keep `ENABLE_CUSTOM_DOMAINS=false` and deploy runtime stacks once.
2. Read `GraphQLStack` output `stageHostedZoneNameServers` (also surfaced in deploy workflow output
   `STAGE_HOSTED_ZONE_NAME_SERVERS`).
3. Set DNS environment vars:
   - `DELEGATED_SUBDOMAIN=beta.af-south-1`
   - `DELEGATED_NAME_SERVERS=<comma-separated from step 2>`
4. Deploy `DnsStack` (CI/CD or manual) so root zone gets NS delegation for `beta.af-south-1`.
5. Set `ENABLE_CUSTOM_DOMAINS=true` and redeploy runtime stacks.

Optional manual deploy commands:

Runtime stacks (Beta):

```bash
STAGE=Beta AWS_REGION=af-south-1 npm run cdk -w @gatherle/cdk -- deploy S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

DNS stack:

```bash
AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively --profile gatherle-dns
```

Read DNS nameservers:

```bash
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-dns-root-zone-072092344224 \
  --query "Stacks[0].Outputs[?OutputKey=='RootHostedZoneNameServers'].OutputValue" \
  --output text \
  --profile gatherle-dns
```

## 7. Onboard a new account or region

1. Add mapping in `infra/lib/constants/accounts.ts` under `STAGE_REGION_ACCOUNT_CONFIGS`.
2. Manually bootstrap `CDKToolkit` in that account+region.
3. Manually deploy `GitHubAuthStack` in that account.
4. Create GitHub Environment `<stage-lower>-<region>` and set secrets.
5. If DNS CI deploy is enabled, also create `dns-<region>` environment with DNS account `ASSUME_ROLE_ARN`.
6. Add region to `.github/workflows/deploy-trigger.yaml` matrix.
7. Ensure backend secret exists: `gatherle/backend/<stage-lower>-<region>`.

## 8. Troubleshooting

Error: `Need to perform AWS calls for account X, but the current credentials are for Y`

Fix:

1. Check profile account: `aws sts get-caller-identity --profile <profile>`
2. Check target account/region in command or stage-region mapping: `aws://<account-id>/<region>` and
   `infra/lib/constants/accounts.ts`
3. Re-run with the matching profile.
