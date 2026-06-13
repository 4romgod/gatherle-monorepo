# GitHub Actions Variables and Secrets Runbook

Use this runbook after AWS bootstrap is complete and `GitHubAuthStack` has been deployed in each target account. It is
the operational source of truth for configuring GitHub Actions repository-level and environment-level variables and
secrets for CI/CD.

See also:

- [AWS Account Setup Runbook](./aws-account-setup.md) for AWS bootstrap, CDK bootstrap, and GitHub role creation.
- [Environment Variables Reference](../environment-variables.md) for broader application/runtime configuration.

## Scope rules

- Use **repository** scope for values shared across multiple deploy targets.
- Use **GitHub Environment** scope for values that differ by stage or by DNS account.
- Do **not** rely on a GitHub Environment named `global`. GitHub Actions does not inherit variables or secrets from one
  environment into another.
- `ASSUME_ROLE_ARN` belongs in GitHub **environment variables**, not secrets. It is an identifier, not a credential.
- Do **not** configure `STAGE`, `AWS_REGION`, or `SECRET_ARN` in GitHub. The deploy workflows derive those values.
- Backend runtime secrets such as `MONGO_DB_URL`, runtime `JWT_SECRET`, and `FIREBASE_FCM_SERVICE_ACCOUNT_JSON` belong
  in AWS Secrets Manager under `gatherle/backend/<stage-lower>-<region>`, not in GitHub.
- The GitHub Environment secret `JWT_SECRET` is only for API e2e jobs and should match the stage runtime value stored in
  AWS Secrets Manager.

## Environment naming

Current environments:

- `beta-af-south-1`
- `prod-af-south-1`
- `dns-af-south-1`

Naming pattern for future targets:

- Runtime environments: `<stage-lower>-<region>`
- DNS environments: `dns-<region>`

Create environments once:

```bash
gh api --method PUT /repos/<owner>/<repo>/environments/beta-af-south-1
gh api --method PUT /repos/<owner>/<repo>/environments/prod-af-south-1
gh api --method PUT /repos/<owner>/<repo>/environments/dns-af-south-1
```

## Exact placement map

Use this section when the question is "where exactly does this key live in GitHub?"

| Name                                    | Exact GitHub location                            | Do not put it here                                                              |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `ENABLE_PROD_DEPLOY`                    | Repository variable                              | Any GitHub Environment                                                          |
| `VERCEL_ORG_ID`                         | Repository variable                              | Any GitHub Environment                                                          |
| `VERCEL_PROJECT_ID`                     | Repository variable                              | Any GitHub Environment                                                          |
| `GOOGLE_OAUTH_CLIENT_ID_ANDROID`        | Repository variable                              | Any GitHub Environment                                                          |
| `GOOGLE_OAUTH_CLIENT_ID_IOS`            | Repository variable                              | Any GitHub Environment                                                          |
| `VERCEL_TOKEN`                          | Repository secret                                | Any GitHub Environment variable                                                 |
| `GOOGLE_OAUTH_CLIENT_ID_WEB`            | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `GOOGLE_OAUTH_CLIENT_SECRET_WEB`        | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `APPLE_OAUTH_CLIENT_SECRET_WEB`         | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ANDROID_GOOGLE_SERVICES_JSON_BASE64`   | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ANDROID_RELEASE_KEYSTORE_BASE64`       | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD`     | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ANDROID_RELEASE_KEY_ALIAS`             | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ANDROID_RELEASE_KEY_PASSWORD`          | Repository secret                                | Runtime or DNS GitHub Environments                                              |
| `ASSUME_ROLE_ARN` for Beta              | GitHub Environment variable in `beta-af-south-1` | Repository variable, repository secret, or `dns-af-south-1`                     |
| `ASSUME_ROLE_ARN` for Prod              | GitHub Environment variable in `prod-af-south-1` | Repository variable, repository secret, or `dns-af-south-1`                     |
| `ASSUME_ROLE_ARN` for DNS               | GitHub Environment variable in `dns-af-south-1`  | Repository variable, repository secret, or runtime environments                 |
| `WEBAPP_URL` for Beta                   | GitHub Environment variable in `beta-af-south-1` | Repository variable or `prod-af-south-1`                                        |
| `WEBAPP_URL` for Prod                   | GitHub Environment variable in `prod-af-south-1` | Repository variable or `beta-af-south-1`                                        |
| `ALERT_EMAIL_RECIPIENTS` for Beta       | GitHub Environment variable in `beta-af-south-1` | Repository variable or `prod-af-south-1`                                        |
| `ALERT_EMAIL_RECIPIENTS` for Prod       | GitHub Environment variable in `prod-af-south-1` | Repository variable or `beta-af-south-1`                                        |
| `EMAIL_FROM` for Beta                   | GitHub Environment variable in `beta-af-south-1` | Repository variable or `prod-af-south-1`                                        |
| `EMAIL_FROM` for Prod                   | GitHub Environment variable in `prod-af-south-1` | Repository variable or `beta-af-south-1`                                        |
| `ENABLE_CUSTOM_DOMAINS` for Beta        | GitHub Environment variable in `beta-af-south-1` | Repository variable or `prod-af-south-1`                                        |
| `ENABLE_CUSTOM_DOMAINS` for Prod        | GitHub Environment variable in `prod-af-south-1` | Repository variable or `beta-af-south-1`                                        |
| `NEXTAUTH_SECRET` for Beta              | GitHub Environment secret in `beta-af-south-1`   | Repository secret or `prod-af-south-1`                                          |
| `NEXTAUTH_SECRET` for Prod              | GitHub Environment secret in `prod-af-south-1`   | Repository secret or `beta-af-south-1`                                          |
| `JWT_SECRET` for Beta e2e               | GitHub Environment secret in `beta-af-south-1`   | Repository secret or `prod-af-south-1`                                          |
| `JWT_SECRET` for Prod e2e               | GitHub Environment secret in `prod-af-south-1`   | Repository secret or `beta-af-south-1`                                          |
| `GATHERLE_TEST_ADMIN_PASSWORD` for Beta | GitHub Environment secret in `beta-af-south-1`   | Repository secret or `prod-af-south-1`                                          |
| `GATHERLE_TEST_ADMIN_PASSWORD` for Prod | GitHub Environment secret in `prod-af-south-1`   | Repository secret or `beta-af-south-1`                                          |
| `GATHERLE_TEST_USER_PASSWORD` for Beta  | GitHub Environment secret in `beta-af-south-1`   | Repository secret or `prod-af-south-1`                                          |
| `GATHERLE_TEST_USER_PASSWORD` for Prod  | GitHub Environment secret in `prod-af-south-1`   | Repository secret or `beta-af-south-1`                                          |
| `GATHERLE_TEST_USER2_PASSWORD` for Beta | GitHub Environment secret in `beta-af-south-1`   | Repository secret or `prod-af-south-1`                                          |
| `GATHERLE_TEST_USER2_PASSWORD` for Prod | GitHub Environment secret in `prod-af-south-1`   | Repository secret or `beta-af-south-1`                                          |
| `DELEGATED_SUBDOMAINS`                  | GitHub Environment variable in `dns-af-south-1`  | Repository variable, repository secret, `beta-af-south-1`, or `prod-af-south-1` |

`DELEGATED_SUBDOMAINS` is specifically a DNS-environment variable. Set it in `dns-af-south-1`, not at repository scope.

## Repository variables

These are shared across runtime environments and are read at repository scope.

| Name                             | Required                                         | Used by             | Notes                                                                              |
| -------------------------------- | ------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------- |
| `ENABLE_PROD_DEPLOY`             | Optional                                         | deploy orchestrator | Set to `true` only when Prod promotion should run after Beta succeeds.             |
| `VERCEL_ORG_ID`                  | Required for web deploys                         | webapp deploy       | Vercel team/org identifier.                                                        |
| `VERCEL_PROJECT_ID`              | Required for web deploys                         | webapp deploy       | Vercel project identifier.                                                         |
| `GOOGLE_OAUTH_CLIENT_ID_ANDROID` | Required for current mobile Google sign-in setup | API deploy          | Injected into runtime so the API can validate Android Google `id_token` audiences. |
| `GOOGLE_OAUTH_CLIENT_ID_IOS`     | Required for current mobile Google sign-in setup | API deploy          | Injected into runtime so the API can validate iOS Google `id_token` audiences.     |

Example:

```bash
gh variable set ENABLE_PROD_DEPLOY --body "false"
gh variable set VERCEL_ORG_ID --body "<vercel-org-id>"
gh variable set VERCEL_PROJECT_ID --body "<vercel-project-id>"
gh variable set GOOGLE_OAUTH_CLIENT_ID_ANDROID --body "<android-client-id>"
gh variable set GOOGLE_OAUTH_CLIENT_ID_IOS --body "<ios-client-id>"
```

## Repository secrets

These are shared across runtime environments and are currently consumed from `secrets.*` in the deploy workflows.

| Name                                  | Required                                | Used by                                  | Notes                                                                             |
| ------------------------------------- | --------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`                        | Required for web deploys                | webapp deploy                            | Vercel API token.                                                                 |
| `GOOGLE_OAUTH_CLIENT_ID_WEB`          | Required for current web + mobile setup | API deploy, webapp deploy, Android build | Kept as a secret in the current workflow wiring, even though it is an identifier. |
| `GOOGLE_OAUTH_CLIENT_SECRET_WEB`      | Required for web Google OAuth           | webapp deploy                            | NextAuth / web Google OAuth secret.                                               |
| `APPLE_OAUTH_CLIENT_SECRET_WEB`       | Required for web Apple OAuth            | webapp deploy                            | Signed Apple client secret JWT.                                                   |
| `ANDROID_GOOGLE_SERVICES_JSON_BASE64` | Required when `build_mobile` runs       | Android build                            | Base64-encoded `google-services.json`.                                            |
| `ANDROID_RELEASE_KEYSTORE_BASE64`     | Required when `build_mobile` runs       | Android build                            | Base64-encoded Android release keystore.                                          |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD`   | Required when `build_mobile` runs       | Android build                            | Android signing keystore password.                                                |
| `ANDROID_RELEASE_KEY_ALIAS`           | Required when `build_mobile` runs       | Android build                            | Kept as a secret in the current workflow wiring.                                  |
| `ANDROID_RELEASE_KEY_PASSWORD`        | Required when `build_mobile` runs       | Android build                            | Android signing key password.                                                     |

Example:

```bash
gh secret set VERCEL_TOKEN
gh secret set GOOGLE_OAUTH_CLIENT_ID_WEB
gh secret set GOOGLE_OAUTH_CLIENT_SECRET_WEB
gh secret set APPLE_OAUTH_CLIENT_SECRET_WEB
gh secret set ANDROID_GOOGLE_SERVICES_JSON_BASE64
gh secret set ANDROID_RELEASE_KEYSTORE_BASE64
gh secret set ANDROID_RELEASE_KEYSTORE_PASSWORD
gh secret set ANDROID_RELEASE_KEY_ALIAS
gh secret set ANDROID_RELEASE_KEY_PASSWORD
```

## Runtime environment variables

Set these separately for each runtime environment such as `beta-af-south-1` and `prod-af-south-1`.

| Name                     | Required    | Used by                                                          | Notes                                                                                                                                       |
| ------------------------ | ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ASSUME_ROLE_ARN`        | Required    | API deploy, API e2e, webapp deploy context, mobile build context | Set this as a GitHub Environment variable in the matching runtime environment only. Value comes from the matching `GitHubAuthStack` output. |
| `WEBAPP_URL`             | Required    | API deploy, API e2e, Android build                               | Used for email links and stage-correct mobile Apple callback host.                                                                          |
| `ALERT_EMAIL_RECIPIENTS` | Recommended | API deploy                                                       | Comma-separated alert recipients for monitoring stack subscriptions.                                                                        |
| `EMAIL_FROM`             | Optional    | API deploy, API e2e                                              | Defaults to `noreply@gatherle.com` if omitted.                                                                                              |
| `ENABLE_CUSTOM_DOMAINS`  | Recommended | API deploy                                                       | Use `false` before NS delegation is complete, `true` after custom-domain wiring is ready.                                                   |

Current examples:

- `beta-af-south-1` -> `WEBAPP_URL=https://beta.gatherle.com`
- `prod-af-south-1` -> `WEBAPP_URL=https://gatherle.com`

Example:

```bash
gh variable set ASSUME_ROLE_ARN --env beta-af-south-1 --body "<beta-role-arn>"
gh variable set ASSUME_ROLE_ARN --env prod-af-south-1 --body "<prod-role-arn>"

gh variable set WEBAPP_URL --env beta-af-south-1 --body "https://beta.gatherle.com"
gh variable set WEBAPP_URL --env prod-af-south-1 --body "https://gatherle.com"

gh variable set ALERT_EMAIL_RECIPIENTS --env beta-af-south-1 --body "alerts@gatherle.com"
gh variable set ALERT_EMAIL_RECIPIENTS --env prod-af-south-1 --body "alerts@gatherle.com"

gh variable set EMAIL_FROM --env beta-af-south-1 --body "noreply@gatherle.com"
gh variable set EMAIL_FROM --env prod-af-south-1 --body "noreply@gatherle.com"

gh variable set ENABLE_CUSTOM_DOMAINS --env beta-af-south-1 --body "true"
gh variable set ENABLE_CUSTOM_DOMAINS --env prod-af-south-1 --body "true"
```

## Runtime environment secrets

Set these separately for each runtime environment such as `beta-af-south-1` and `prod-af-south-1`.

| Name                           | Required                           | Used by       | Notes                                                           |
| ------------------------------ | ---------------------------------- | ------------- | --------------------------------------------------------------- |
| `NEXTAUTH_SECRET`              | Required for web deploys           | webapp deploy | Webapp session signing secret.                                  |
| `JWT_SECRET`                   | Required when API deploy + e2e run | API e2e       | Must match the stage runtime JWT secret in AWS Secrets Manager. |
| `GATHERLE_TEST_ADMIN_PASSWORD` | Required when API deploy + e2e run | API e2e       | Seeded admin user password for that stage.                      |
| `GATHERLE_TEST_USER_PASSWORD`  | Required when API deploy + e2e run | API e2e       | Seeded test user password for that stage.                       |
| `GATHERLE_TEST_USER2_PASSWORD` | Required when API deploy + e2e run | API e2e       | Seeded second test user password for that stage.                |

Example:

```bash
gh secret set NEXTAUTH_SECRET --env beta-af-south-1
gh secret set NEXTAUTH_SECRET --env prod-af-south-1
gh secret set JWT_SECRET --env beta-af-south-1
gh secret set JWT_SECRET --env prod-af-south-1
gh secret set GATHERLE_TEST_ADMIN_PASSWORD --env beta-af-south-1
gh secret set GATHERLE_TEST_ADMIN_PASSWORD --env prod-af-south-1
gh secret set GATHERLE_TEST_USER_PASSWORD --env beta-af-south-1
gh secret set GATHERLE_TEST_USER_PASSWORD --env prod-af-south-1
gh secret set GATHERLE_TEST_USER2_PASSWORD --env beta-af-south-1
gh secret set GATHERLE_TEST_USER2_PASSWORD --env prod-af-south-1
```

## DNS environment variables

Set these in the DNS environment for the target region, for example `dns-af-south-1`.

| Name                   | Required                                   | Used by    | Notes                                                                                                                                                               |
| ---------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ASSUME_ROLE_ARN`      | Required                                   | DNS deploy | Set this as a GitHub Environment variable in `dns-af-south-1` only. Value comes from `GithubActionDnsDeployRoleArn` in the DNS account `GitHubAuthStack` output.    |
| `DELEGATED_SUBDOMAINS` | Optional until stage delegation is enabled | DNS deploy | Set this as a GitHub Environment variable in `dns-af-south-1` only. Do not store it as a repository variable. JSON array of `{ subdomain, nameServers[] }` objects. |

Example:

```bash
gh variable set ASSUME_ROLE_ARN --env dns-af-south-1 --body "<dns-role-arn>"

gh variable set DELEGATED_SUBDOMAINS \
  --env dns-af-south-1 \
  --body '[{"subdomain":"beta.af-south-1","nameServers":["<ns1>","<ns2>","<ns3>","<ns4>"]},{"subdomain":"prod.af-south-1","nameServers":["<ns1>","<ns2>","<ns3>","<ns4>"]}]'
```

## Verification checklist

After setup, verify the following:

1. Repository variables exist for Vercel IDs, mobile Google IDs, and `ENABLE_PROD_DEPLOY`.
2. Repository secrets exist for Vercel, web OAuth, and Android signing/build inputs.
3. `beta-af-south-1` and `prod-af-south-1` each have their own `ASSUME_ROLE_ARN`, `WEBAPP_URL`, e2e passwords,
   `JWT_SECRET`, and `NEXTAUTH_SECRET`.
4. `dns-af-south-1` has its own `ASSUME_ROLE_ARN` and the current `DELEGATED_SUBDOMAINS` JSON.
5. No required deploy setting is stored only in a `global` GitHub Environment.
6. No one added `STAGE`, `AWS_REGION`, or `SECRET_ARN` to GitHub expecting the workflows to read them.

## When adding a new stage or region

1. Deploy `GitHubAuthStack` in the target AWS account and capture the correct role ARN output.
2. Create the matching GitHub Environment using the naming convention in this doc.
3. Copy the runtime environment variable/secret set from an existing stage and replace stage-specific values.
4. If the new stage will use DNS CI/CD, update the matching `dns-<region>` environment too.
5. If the new stage will deploy through the orchestrator, add the region/stage wiring in
   `.github/workflows/deploy-trigger.yaml`.
