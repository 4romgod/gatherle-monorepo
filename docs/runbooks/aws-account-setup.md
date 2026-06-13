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
- `Gatherle-prod` account ID: `969849535023`
- Active region in config: `af-south-1`
- Root domain: `gatherle.com`

## 1. Create AWS CLI profiles

Preferred: AWS SSO / IAM Identity Center.

```bash
aws configure sso --profile gatherle-dns
aws configure sso --profile gatherle-beta
aws configure sso --profile gatherle-prod
```

```bash
aws sso login --profile gatherle-dns
aws sso login --profile gatherle-beta
aws sso login --profile gatherle-prod
aws sts get-caller-identity --profile gatherle-dns
aws sts get-caller-identity --profile gatherle-beta
aws sts get-caller-identity --profile gatherle-prod
```

Expected:

- `gatherle-dns` -> `072092344224`
- `gatherle-beta` -> `327319899143`
- `gatherle-prod` -> `969849535023`

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

Prod account (`Gatherle-prod`):

```bash
STAGE=Prod AWS_REGION=af-south-1 npm run cdk -w @gatherle/cdk -- bootstrap aws://969849535023/af-south-1 --profile gatherle-prod
```

Verify:

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --region af-south-1 --profile gatherle-dns
aws cloudformation describe-stacks --stack-name CDKToolkit --region af-south-1 --profile gatherle-beta
aws cloudformation describe-stacks --stack-name CDKToolkit --region af-south-1 --profile gatherle-prod
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
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionBetaDeployRoleArn'].OutputValue" \
  --output text \
  --profile gatherle-beta
```

Prod account (`Gatherle-prod`):

```bash
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=969849535023 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively --profile gatherle-prod
```

Read role ARN (Prod):

```bash
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-969849535023 \
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionProdDeployRoleArn'].OutputValue" \
  --output text \
  --profile gatherle-prod
```

DNS account (`Gatherle-dns`) for DNS CI/CD:

```bash
AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=072092344224 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively --profile gatherle-dns
```

Read role ARN (DNS):

```bash
AWS_REGION=af-south-1 aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-072092344224 \
  --query "Stacks[0].Outputs[?OutputKey=='GithubActionDnsDeployRoleArn'].OutputValue" \
  --output text \
  --profile gatherle-dns
```

Set each ARN into the matching GitHub Environment variable `ASSUME_ROLE_ARN`. Stage-dedicated runtime accounts emit only
their own runtime role output, so the beta account provides `GithubActionBetaDeployRoleArn` and the prod account
provides `GithubActionProdDeployRoleArn`.

## 4. Configure GitHub environments and secrets

Use [GitHub Actions Variables and Secrets Runbook](./github-actions-variables-and-secrets.md).

That runbook covers:

- repository variables shared across stages
- repository secrets shared across stages
- runtime environment variables and secrets for `beta-af-south-1` and `prod-af-south-1`
- DNS environment variables for `dns-af-south-1`
- values that should stay out of GitHub because they belong in AWS Secrets Manager instead

At minimum, carry the role ARNs from section 3 into the matching GitHub Environment variable `ASSUME_ROLE_ARN`.

## 5. DNS setup (root + stage delegation)

This is the DNS model used by this repo:

- Root zone `gatherle.com` is hosted in `Gatherle-dns` account.
- Stage zones such as `beta.af-south-1.gatherle.com` and `prod.af-south-1.gatherle.com` are hosted in their runtime
  accounts by `StageInfraStack`, which also manages the wildcard ACM certificate for each stage-region subdomain. These
  rarely change.
- `GraphQLStack` and `WebSocketApiStack` read the hosted zone ID and certificate ARN via
  `StringParameter.valueForStringParameter()`, which emits CloudFormation `{{resolve:ssm:...}}` dynamic references
  resolved at deploy time (no `Fn::ImportValue`, no synth-time SSM API calls). `addDependency(stageInfraStack)` ensures
  CDK's deployment engine always deploys `StageInfraStack` before the consumers in a single pass, so the parameters are
  present when CloudFormation resolves them.
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

1. Deploy runtime stacks for each stage you want to delegate. CDK deploys `StageInfraStack` before the consumer stacks
   (enforced by `addDependency`), so the SSM parameters exist when CloudFormation resolves them.

```bash
STAGE=Beta AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=false WEBAPP_URL=https://beta.gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

```bash
STAGE=Prod AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=false WEBAPP_URL=https://gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-prod
```

2. Copy `stageHostedZoneNameServers` (also surfaced by deploy workflow output `STAGE_HOSTED_ZONE_NAME_SERVERS`) for each
   stage.

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-stage-infra-beta-af-south-1 \
  --query "Stacks[0].Outputs[?OutputKey=='stageHostedZoneNameServers'].OutputValue" \
  --output text \
  --region af-south-1 \
  --profile gatherle-beta
```

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-stage-infra-prod-af-south-1 \
  --query "Stacks[0].Outputs[?OutputKey=='stageHostedZoneNameServers'].OutputValue" \
  --output text \
  --region af-south-1 \
  --profile gatherle-prod
```

3. Set the GitHub Environment variable in `dns-af-south-1` (used by CI/CD deploys). Include every stage subdomain you
   want the DNS workflow to manage.

```bash
gh variable set DELEGATED_SUBDOMAINS \
  --body '[{"subdomain":"beta.af-south-1","nameServers":["<beta ns1>","<beta ns2>","<beta ns3>","<beta ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<prod ns1>","<prod ns2>","<prod ns3>","<prod ns4>"]}]' \
  --env dns-af-south-1
```

4. Deploy DNS stack. This creates root-zone NS records for the delegated stage subdomains.

   CI/CD: trigger `.github/workflows/deploy-trigger.yaml`.

   Manual (env var must be passed inline — it is read by CDK at synth time, not from GitHub):

```bash
AWS_REGION=af-south-1 \
DELEGATED_SUBDOMAINS='[{"subdomain":"beta.af-south-1","nameServers":["<beta ns1>","<beta ns2>","<beta ns3>","<beta ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<prod ns1>","<prod ns2>","<prod ns3>","<prod ns4>"]}]' \
npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively --profile gatherle-dns
```

5. Verify the delegated subdomains you enabled:

```bash
dig +short NS beta.af-south-1.gatherle.com
dig +short NS prod.af-south-1.gatherle.com
```

### C. Enable API/WS custom domains

1. Set `ENABLE_CUSTOM_DOMAINS=true` in each runtime environment that should use custom API/WebSocket domains.

```bash
gh variable set ENABLE_CUSTOM_DOMAINS --body "true" --env beta-af-south-1
gh variable set ENABLE_CUSTOM_DOMAINS --body "true" --env prod-af-south-1
```

2. Deploy runtime stacks. `StageInfraStack` creates the wildcard ACM certificate first (enforced by `addDependency`);
   CloudFormation resolves `/stageCertificateArn` for the consumer stacks once it exists.

```bash
STAGE=Beta AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=true WEBAPP_URL=https://beta.gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

```bash
STAGE=Prod AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=true WEBAPP_URL=https://gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-prod
```

3. Verify:

```bash
dig +short api.beta.af-south-1.gatherle.com
dig +short ws.beta.af-south-1.gatherle.com
dig +short api.prod.af-south-1.gatherle.com
dig +short ws.prod.af-south-1.gatherle.com
```

### D. Connect webapp domain in Vercel (manual, once per hostname)

This project currently deploys webapp builds to Vercel preview URLs from CI/CD.  
Custom hostnames must be attached in Vercel and mapped in Route53 (DNS account).

Recommended hostnames:

- `beta.gatherle.com` (primary beta web hostname)
- `www.beta.gatherle.com` (optional alias that redirects to `beta.gatherle.com`)
- `gatherle.com` (primary prod web hostname)
- `www.gatherle.com` (optional alias that redirects to `gatherle.com`)

1. In Vercel project settings (or CLI), add the domain:

```bash
vercel domains add beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
vercel domains add www.beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
vercel domains add gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
vercel domains add www.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
```

2. In Route53 hosted zone `gatherle.com` (DNS account), create records using the exact targets Vercel shows:

- `beta.gatherle.com` -> `CNAME` -> `<vercel target for beta>`
- `www.beta.gatherle.com` -> `CNAME` -> `beta.gatherle.com` (or Vercel-provided target)
- `gatherle.com` -> `CNAME` or ALIAS/ANAME target Vercel specifies for prod
- `www.gatherle.com` -> `CNAME` -> `gatherle.com` (or Vercel-provided target)

3. Point a deployment to the hostname (optional if Vercel already auto-assigned):

```bash
vercel alias set <deployment-url> beta.gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
vercel alias set <deployment-url> gatherle.com --scope <vercel-team-slug> --token <VERCEL_TOKEN>
```

Note: deployments to both `Beta` and `Prod` can perform this alias step automatically via
`.github/workflows/deploy.yaml`. This is controlled by the caller workflow via `web_domain_alias` input, so reusable
deploy logic stays stage-agnostic.

4. In Vercel, set canonical redirect:

- Redirect `www.beta.gatherle.com` -> `beta.gatherle.com`.
- Redirect `www.gatherle.com` -> `gatherle.com`.

5. Verify DNS propagation and Vercel status:

```bash
dig +short beta.gatherle.com CNAME
dig +short www.beta.gatherle.com CNAME
dig +short gatherle.com
dig +short www.gatherle.com CNAME
```

- In Vercel Domains page, both hostnames should show valid configuration.
- If not, click `Refresh` after DNS propagation.

## 6. Manual backend secret bootstrap / rotation

Use this when bootstrapping a new stage+region secret or intentionally rotating backend secret values.

```bash
STAGE=Beta AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' FIREBASE_FCM_SERVICE_ACCOUNT_JSON="$(jq -c . /secure/path/firebase-admin.json)" npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively --profile gatherle-beta
```

```bash
STAGE=Prod AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' FIREBASE_FCM_SERVICE_ACCOUNT_JSON="$(jq -c . /secure/path/firebase-admin.json)" npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively --profile gatherle-prod
```

Verify:

```bash
aws secretsmanager describe-secret \
  --secret-id gatherle/backend/beta-af-south-1 \
  --query "ARN" \
  --output text \
  --profile gatherle-beta
```

```bash
aws secretsmanager describe-secret \
  --secret-id gatherle/backend/prod-af-south-1 \
  --query "ARN" \
  --output text \
  --profile gatherle-prod
```

Important:

- Runtime deploy workflow intentionally excludes `SecretsManagementStack`.
- Keep secret value changes intentional and manual.
- The dedicated app for this step is `infrastructure/cdk/lib/secrets-app.ts`.

This step must be completed before runtime service stack deployment.

## 7. SES production access and identity verification

### A. Request SES production access (exit sandbox)

New AWS accounts start in SES sandbox mode — outbound email is restricted to verified addresses only. Request production
access **once per account+region** before sending transactional email. Repeat this for both Beta and Prod runtime
accounts.

1. In the AWS console, navigate to **SES → Account dashboard** in the target region.
2. Click **Request production access**.
3. Fill in the form:
   - **Mail type**: Transactional
   - **Website URL**: `https://gatherle.com`
   - **Use case description**: Describe sending email verification links and password reset links to registered users.
4. Submit and wait for AWS approval (typically 24 hours). You will receive an email confirmation.

Alternatively via CLI (creates a support case):

```bash
aws sesv2 put-account-details \
  --mail-type TRANSACTIONAL \
  --website-url https://gatherle.com \
  --use-case-description "Transactional email: email verification and password reset for gatherle.com users." \
  --production-access-enabled \
  --region af-south-1 \
  --profile gatherle-beta
```

```bash
aws sesv2 put-account-details \
  --mail-type TRANSACTIONAL \
  --website-url https://gatherle.com \
  --use-case-description "Transactional email: email verification and password reset for gatherle.com users." \
  --production-access-enabled \
  --region af-south-1 \
  --profile gatherle-prod
```

### B. Retrieve DNS verification records from SesStack output

After the first `SesStack` deploy, retrieve the 5 DNS records that SES requires:

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-ses-beta-af-south-1 \
  --query "Stacks[0].Outputs" \
  --output table \
  --region af-south-1 \
  --profile gatherle-beta
```

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-ses-prod-af-south-1 \
  --query "Stacks[0].Outputs" \
  --output table \
  --region af-south-1 \
  --profile gatherle-prod
```

The outputs to look for follow the same pattern per stage:

| Output key                                    | DNS record type    | DNS name                           | Value                                    |
| --------------------------------------------- | ------------------ | ---------------------------------- | ---------------------------------------- |
| `SesDkimRecord1-<stage-lower>-<region>`       | `CNAME`            | `<token1>._domainkey.gatherle.com` | `<token1>.dkim.amazonses.com`            |
| `SesDkimRecord2-<stage-lower>-<region>`       | `CNAME`            | `<token2>._domainkey.gatherle.com` | `<token2>.dkim.amazonses.com`            |
| `SesDkimRecord3-<stage-lower>-<region>`       | `CNAME`            | `<token3>._domainkey.gatherle.com` | `<token3>.dkim.amazonses.com`            |
| `SesMailFromMxRecord-<stage-lower>-<region>`  | `MX` (priority 10) | `mail.gatherle.com`                | `feedback-smtp.af-south-1.amazonses.com` |
| `SesMailFromSpfRecord-<stage-lower>-<region>` | `TXT`              | `mail.gatherle.com`                | `"v=spf1 include:amazonses.com ~all"`    |

### C. Add DNS records to the root hosted zone (DNS account)

Add all 5 records to the `gatherle.com` hosted zone in the `Gatherle-dns` account. This is a one-time manual step — AWS
Easy DKIM rotates keys transparently without requiring DNS changes.

Example using AWS CLI (DNS account profile):

```bash
# Replace <token1/2/3> with values from SesStack outputs above
aws route53 change-resource-record-sets \
  --hosted-zone-id <gatherle-com-hosted-zone-id> \
  --change-batch '{
    "Changes": [
      {"Action":"UPSERT","ResourceRecordSet":{"Name":"<token1>._domainkey.gatherle.com","Type":"CNAME","TTL":300,"ResourceRecords":[{"Value":"<token1>.dkim.amazonses.com"}]}},
      {"Action":"UPSERT","ResourceRecordSet":{"Name":"<token2>._domainkey.gatherle.com","Type":"CNAME","TTL":300,"ResourceRecords":[{"Value":"<token2>.dkim.amazonses.com"}]}},
      {"Action":"UPSERT","ResourceRecordSet":{"Name":"<token3>._domainkey.gatherle.com","Type":"CNAME","TTL":300,"ResourceRecords":[{"Value":"<token3>.dkim.amazonses.com"}]}},
      {"Action":"UPSERT","ResourceRecordSet":{"Name":"mail.gatherle.com","Type":"MX","TTL":300,"ResourceRecords":[{"Value":"10 feedback-smtp.af-south-1.amazonses.com"}]}},
      {"Action":"UPSERT","ResourceRecordSet":{"Name":"mail.gatherle.com","Type":"TXT","TTL":300,"ResourceRecords":[{"Value":"\"v=spf1 include:amazonses.com ~all\""}]}}
    ]
  }' \
  --profile gatherle-dns
```

### D. Verify SES identity status

SES polls DNS automatically. Verification typically completes within minutes of DNS propagation.

```bash
aws sesv2 get-email-identity \
  --email-identity gatherle.com \
  --region af-south-1 \
  --profile gatherle-beta
```

```bash
aws sesv2 get-email-identity \
  --email-identity gatherle.com \
  --region af-south-1 \
  --profile gatherle-prod
```

Expected:

- `VerificationStatus`: `SUCCESS`
- `DkimAttributes.Status`: `SUCCESS`
- `MailFromAttributes.MailFromDomainStatus`: `SUCCESS`

### E. Set GitHub Environment variables for email

```bash
gh variable set WEBAPP_URL --body "https://beta.gatherle.com" --env beta-af-south-1
gh variable set WEBAPP_URL --body "https://gatherle.com" --env prod-af-south-1
# EMAIL_FROM defaults to noreply@gatherle.com — only needed if overriding
# gh variable set EMAIL_FROM --body "noreply@gatherle.com" --env beta-af-south-1
# gh variable set EMAIL_FROM --body "noreply@gatherle.com" --env prod-af-south-1
```

## 8. Deploy stacks (CI/CD preferred)

Preferred:

- Let `.github/workflows/deploy-trigger.yaml` orchestrate DNS and runtime deploys.
- `.github/workflows/deploy-dns.yaml` deploys `DnsStack` using `dns-<region>` environment (for example
  `dns-af-south-1`).
- `.github/workflows/deploy.yaml` deploys runtime stacks using `<stage-lower>-<region>` environments.

Recommended first rollout order for custom domains:

1. Keep `ENABLE_CUSTOM_DOMAINS=false` and deploy runtime stacks for each stage. CDK deploys `StageInfraStack` before the
   consumer stacks (enforced by `addDependency`), so the SSM parameters are present when CloudFormation resolves them.

```bash
STAGE=Beta AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=false WEBAPP_URL=https://beta.gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

```bash
STAGE=Prod AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=false WEBAPP_URL=https://gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-prod
```

2. Read `StageInfraStack` output `stageHostedZoneNameServers` (also surfaced in deploy workflow output
   `STAGE_HOSTED_ZONE_NAME_SERVERS`) for each stage.

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-stage-infra-beta-af-south-1 \
  --query "Stacks[0].Outputs[?OutputKey=='stageHostedZoneNameServers'].OutputValue" \
  --output text \
  --region af-south-1 \
  --profile gatherle-beta
```

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-stage-infra-prod-af-south-1 \
  --query "Stacks[0].Outputs[?OutputKey=='stageHostedZoneNameServers'].OutputValue" \
  --output text \
  --region af-south-1 \
  --profile gatherle-prod
```

3. Set the GitHub Environment variable in `dns-af-south-1` (used by CI/CD deploys):

```bash
gh variable set DELEGATED_SUBDOMAINS \
  --body '[{"subdomain":"beta.af-south-1","nameServers":["<beta ns1>","<beta ns2>","<beta ns3>","<beta ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<prod ns1>","<prod ns2>","<prod ns3>","<prod ns4>"]}]' \
  --env dns-af-south-1
```

4. Deploy `DnsStack` so root zone gets NS delegation for the configured stage subdomains.

   CI/CD: trigger `.github/workflows/deploy-trigger.yaml`.

   Manual (env var must be passed inline — it is read by CDK at synth time, not from GitHub):

```bash
AWS_REGION=af-south-1 \
DELEGATED_SUBDOMAINS='[{"subdomain":"beta.af-south-1","nameServers":["<beta ns1>","<beta ns2>","<beta ns3>","<beta ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<prod ns1>","<prod ns2>","<prod ns3>","<prod ns4>"]}]' \
npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively --profile gatherle-dns
```

5. Set `ENABLE_CUSTOM_DOMAINS=true` and redeploy runtime stacks for each stage. `StageInfraStack` creates the
   certificate first (enforced by `addDependency`), so the consumer stacks resolve `/stageCertificateArn` correctly.

```bash
gh variable set ENABLE_CUSTOM_DOMAINS --body "true" --env beta-af-south-1
STAGE=Beta AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=true WEBAPP_URL=https://beta.gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

```bash
gh variable set ENABLE_CUSTOM_DOMAINS --body "true" --env prod-af-south-1
STAGE=Prod AWS_REGION=af-south-1 ENABLE_CUSTOM_DOMAINS=true WEBAPP_URL=https://gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-prod
```

Optional manual deploy commands:

Runtime stacks (Beta):

```bash
STAGE=Beta AWS_REGION=af-south-1 WEBAPP_URL=https://beta.gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-beta
```

Runtime stacks (Prod):

```bash
STAGE=Prod AWS_REGION=af-south-1 WEBAPP_URL=https://gatherle.com npm run cdk -w @gatherle/cdk -- deploy SesStack StageInfraStack S3BucketStack GraphQLStack WebSocketApiStack MonitoringDashboardStack --require-approval never --exclusively --profile gatherle-prod
```

DNS stack (with delegation — env var is read at synth time and must be passed inline):

```bash
AWS_REGION=af-south-1 \
DELEGATED_SUBDOMAINS='[{"subdomain":"beta.af-south-1","nameServers":["<beta ns1>","<beta ns2>","<beta ns3>","<beta ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<prod ns1>","<prod ns2>","<prod ns3>","<prod ns4>"]}]' \
npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively --profile gatherle-dns
```

DNS stack (without delegation — creates/updates root zone only):

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

## 9. Onboard a new account or region

1. Add mapping in `infrastructure/cdk/lib/constants/accounts.ts` under `STAGE_REGION_ACCOUNT_CONFIGS`.

2. Manually bootstrap `CDKToolkit` in that account+region.

```bash
STAGE=<Stage> AWS_REGION=<region> npm run cdk -w @gatherle/cdk -- bootstrap aws://<account-id>/<region> --profile <profile>
```

3. Manually deploy `GitHubAuthStack` in that account.

```bash
AWS_REGION=<region> TARGET_AWS_ACCOUNT_ID=<account-id> npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively --profile <profile>
```

Read the role ARN:

```bash
AWS_REGION=<region> aws cloudformation describe-stacks \
  --stack-name gatherle-github-auth-<account-id> \
  --query "Stacks[0].Outputs[].{Key:OutputKey,Value:OutputValue}" \
  --output table \
  --profile <profile>
```

Use the output that matches the environment you are wiring:

- runtime beta -> `GithubActionBetaDeployRoleArn`
- runtime prod -> `GithubActionProdDeployRoleArn`
- DNS -> `GithubActionDnsDeployRoleArn`

4. Configure GitHub repository-level and environment-level variables/secrets using
   [GitHub Actions Variables and Secrets Runbook](./github-actions-variables-and-secrets.md).

5. Add region to `.github/workflows/deploy-trigger.yaml` matrix.

6. Ensure backend secret exists: `gatherle/backend/<stage-lower>-<region>`.

```bash
STAGE=<Stage> AWS_REGION=<region> MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' FIREBASE_FCM_SERVICE_ACCOUNT_JSON="$(jq -c . /secure/path/firebase-admin.json)" npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively --profile <profile>
```

7. **Request SES production access** for the new account+region (see section 7A above). New AWS accounts/regions default
   to sandbox mode.

8. After first `SesStack` deploy, add the 5 DNS verification records to the `gatherle.com` hosted zone (see section
   7B–7D above).

9. After the first `MonitoringDashboardStack` deploy, confirm the SNS email subscription messages from each inbox.

## 10. Troubleshooting

Error: `Need to perform AWS calls for account X, but the current credentials are for Y`

Fix:

1. Check profile account: `aws sts get-caller-identity --profile <profile>`
2. Check target account/region in command or stage-region mapping: `aws://<account-id>/<region>` and
   `infrastructure/cdk/lib/constants/accounts.ts`
3. Re-run with the matching profile.

---

Error: `Certificate ... is in use (ResourceInUseException)` during `StageInfraStack` update

Cause: CDK deploys `StageInfraStack` before consumer stacks (due to `addDependency`). When switching from an older
layout where `GraphQLStack` owned the certificate to the current layout where `StageInfraStack` owns it,
`StageInfraStack` attempts to delete the old cert before `GraphQLStack`/`WebSocketApiStack` have released their
`DomainName` resources that reference it.

The stack update itself completes (`UPDATE_COMPLETE`) but the cert deletion fails, leaving the certificate as an orphan
in ACM — no longer tracked by any CloudFormation stack.

Fix (one-time migration only):

1. Deploy consumer stacks with `ENABLE_CUSTOM_DOMAINS=false` first to remove their `DomainName` and `ARecord` resources:

```bash
STAGE=<Stage> AWS_REGION=<region> ENABLE_CUSTOM_DOMAINS=false WEBAPP_URL=<webapp-url> \
npm run cdk -w @gatherle/cdk -- deploy GraphQLStack WebSocketApiStack \
--require-approval never --exclusively --profile <profile>
```

2. Manually delete the now-unreferenced orphaned certificate from ACM:

```bash
aws acm delete-certificate \
  --certificate-arn <orphaned-cert-arn> \
  --region <region> \
  --profile <profile>
```

3. Re-enable custom domains. `StageInfraStack` creates the new certificate and consumer stacks recreate their custom
   domain resources:

```bash
STAGE=<Stage> AWS_REGION=<region> ENABLE_CUSTOM_DOMAINS=true WEBAPP_URL=<webapp-url> \
npm run cdk -w @gatherle/cdk -- deploy StageInfraStack GraphQLStack WebSocketApiStack \
--require-approval never --exclusively --profile <profile>
```
