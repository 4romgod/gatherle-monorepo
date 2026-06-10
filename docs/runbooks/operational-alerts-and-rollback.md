# Operational Alerts And Rollback Runbook

Created: 2026-06-07

This runbook defines how Gatherle detects beta incidents, who gets notified, and how to roll back the current mobile
first product surfaces quickly.

Use this with:

- `docs/api/observability.md`
- `docs/beta-launch-readiness.md`
- `.github/workflows/deploy.yaml`

---

## 1. Current Operating Model

Gatherle does **not** currently use full blue/green deployment for the backend.

The current release model is:

- GraphQL API and WebSocket runtime: in-place AWS CDK deploys
- Webapp: Vercel deployment plus domain aliasing
- Android beta build: GitHub Actions release APK
- iOS beta distribution: external release channel process, not repo automation

That means rollback is different per surface:

- backend rollback is a redeploy of a known-good ref
- webapp rollback is usually an alias flip or redeploy of a known-good ref
- mobile rollback is a release-channel action, not an infrastructure traffic flip

### Blue/green stance

Blue/green is not implemented for the API or WebSocket stacks today.

For this beta, the requirement is:

- clear alert routing
- clear rollback ownership
- a rehearsed known-good redeploy path

Not:

- full parallel production environments

---

## 2. Alert Routing

### What exists in the repo now

The monitoring stack now provisions:

- one SNS topic per stage-region environment:
  - `gatherle-operational-alerts-<stage>-<region>`

Current GraphQL and WebSocket CloudWatch alarms publish to that topic when they enter the `ALARM` state.

The current alarm families include:

- GraphQL 4xx spikes
- GraphQL 5xx spikes
- GraphQL throttles
- query guard rejection spikes
- login failure and lockout spikes
- occurrence maintenance failures and drift signals
- WebSocket Lambda errors
- WebSocket throttles
- WebSocket client, integration, and execution error spikes
- WebSocket connect and message spikes

### How recipients are configured

Set the GitHub Environment variable:

- `ALERT_EMAIL_RECIPIENTS`

Format:

- comma-separated email addresses
- example: `alerts@gatherle.com,founder@gatherle.com`

Deploying `MonitoringDashboardStack` with that variable creates SNS email subscriptions automatically.

Important:

- each email subscription requires one-time confirmation from the recipient inbox
- until the confirmation link is clicked, the alarm path is not operational for that recipient

### Required launch-time checks

Before beta launch:

1. Set `ALERT_EMAIL_RECIPIENTS` for the target GitHub Environment.
2. Deploy the monitoring stack.
3. Confirm every email subscription from the inbox.
4. Record the confirmed recipients in the launch checklist.
5. Send a manual SNS test message to verify delivery.

### Manual alert-path smoke test

After deploy, retrieve the topic ARN from CloudFormation output `OperationalAlertsTopicArn`, then publish a manual test
message:

```bash
aws cloudformation describe-stacks \
  --stack-name gatherle-monitoring-dashboard-beta-af-south-1 \
  --query "Stacks[0].Outputs[?OutputKey=='OperationalAlertsTopicArn'].OutputValue" \
  --output text
```

Then publish:

```bash
aws sns publish \
  --topic-arn <OperationalAlertsTopicArn> \
  --subject "Gatherle beta alert path test" \
  --message "This is a manual verification of the Gatherle operational alerts topic."
```

Expected result:

- every configured recipient receives the test notification

If the message is not received:

- verify the subscription is `Confirmed`
- verify the deploy used the correct `ALERT_EMAIL_RECIPIENTS`
- check whether the wrong stage-region environment was updated

---

## 3. Logging And Dashboards

### Primary operational surfaces

Start incident work in this order:

1. CloudWatch dashboard for the target stage-region
2. CloudWatch alarm details
3. CloudWatch Logs Insights queries
4. direct Lambda/API Gateway logs

Primary dashboards:

- `Gatherle-GraphQL-<stage>-<region>`
- `Gatherle-WebSocket-<stage>-<region>`

Primary log groups:

- `/aws/lambda/GraphqlLambdaFunction-<stage>-<region>`
- `/aws/lambda/OccurrenceMaintenanceLambdaFunction-<stage>-<region>`
- `/aws/lambda/WebSocketLambdaFunction-<stage>-<region>`
- `/aws/apigateway/GraphqlRestApiAccessLogs-<stage>-<region>`

### First-response questions

For any incident, answer these first:

1. Is this a client-only issue or a backend issue?
2. Did the failure begin immediately after a deploy?
3. Is the problem GraphQL, WebSocket, media, or auth specific?
4. Is the issue isolated to one user or widespread?
5. Is rollback faster than live debugging?

### Rollback-biased conditions

Bias toward rollback if any of these are true after launch:

- sustained GraphQL 5xx alarm after a fresh deploy
- realtime messaging or notifications broken for broad user traffic
- login flow broadly failing
- event detail or RSVP mutations broadly failing
- data corruption or unauthorized data exposure is suspected

---

## 4. Rollback Decision Rules

### Who can trigger rollback

Before launch, assign by name:

- incident owner
- deploy/rollback operator
- product decision owner

Do not leave this as "the team."

### When to roll back

Roll back when:

- the issue is user-visible on a core surface
- the issue started with the latest release
- the impact is broad enough that debugging in place is higher risk than reverting

### Expected recovery targets

Reasonable beta targets:

- alert receipt verification: under 10 minutes
- webapp alias rollback: under 10 minutes
- backend known-good redeploy: 15 to 30 minutes
- Android beta rollback via prior APK: 15 to 30 minutes to redistribute internally
- iOS/TestFlight mitigation: depends on Apple review/distribution state; use rollout halt and communication immediately

---

## 5. Backend Rollback: GraphQL And WebSocket

### Preferred path

Use the manual `Deploy` workflow in GitHub Actions.

This workflow now supports `workflow_dispatch`, so it can be run intentionally for rollback instead of only through the
PR-triggered path.

### Procedure

1. Identify the last known-good Git ref.
2. In GitHub Actions, run `Deploy` manually from that ref.
3. Use:
   - `stage=Beta`
   - `region=af-south-1`
   - `deploy_api=true`
   - `deploy_webapp=false` unless web must also roll back
   - `build_mobile=false` unless mobile must also be rebuilt
4. Wait for:
   - `deploy-api`
   - API readiness probe
   - API e2e shards
5. Verify:
   - GraphQL health probe succeeds
   - login works
   - event detail works
   - websocket `ping` works
   - direct messaging clears pending state without refresh

### Manual CLI fallback

If GitHub Actions is unavailable, redeploy the known-good ref manually from a trusted machine:

```bash
STAGE=Beta \
AWS_REGION=af-south-1 \
ENABLE_CUSTOM_DOMAINS=true \
WEBAPP_URL=https://beta.gatherle.com \
ALERT_EMAIL_RECIPIENTS="<comma-separated-emails>" \
npm run cdk -w @gatherle/cdk -- deploy \
  SesStack \
  StageInfraStack \
  S3BucketStack \
  GraphQLStack \
  WebSocketApiStack \
  MonitoringDashboardStack \
  MediaStack \
  --require-approval never \
  --exclusively \
  --profile <aws-profile>
```

Use the known-good checkout before running that command.

### Notes

- This is an in-place redeploy, not a traffic flip.
- If the incident is isolated to the WebSocket layer, redeploying the full runtime stack is still acceptable for beta.
- If data integrity is in doubt, stop and investigate before repeated redeploys.

---

## 6. Webapp Rollback

### Preferred path

Use Vercel deployment history and domain aliasing.

### Procedure

1. Find the last known-good deployment in Vercel.
2. Re-point the beta alias to that deployment.
3. Verify:
   - `https://beta.gatherle.com`
   - auth flow
   - `Home`
   - `Explore`
   - one event detail page
   - messages and notifications boot normally

### Alternate path

Run the manual `Deploy` workflow from a known-good Git ref with:

- `deploy_webapp=true`
- `deploy_api=false`

Use this when the problem is in checked-in web code rather than only a bad Vercel alias target.

---

## 7. Mobile Rollback

### Android beta

Current repo automation produces a release APK and publishes it as a GitHub Release artifact.

Rollback path:

1. Identify the last known-good APK release.
2. Stop distributing the bad APK.
3. Re-share or reinstall the last known-good APK to the beta audience.
4. If Play internal/testing rollout is used outside this repo, halt the rollout there and re-promote the previous good
   version.

### iOS beta

Current repo automation does not ship iOS.

Rollback path depends on the external release channel:

- stop or pause TestFlight rollout
- keep the previous stable build available if possible
- communicate clearly to testers if manual reinstall is required

### Important constraint

Mobile rollback is slower than web rollback unless a remote config or kill-switch path already exists.

For beta, assume:

- server-side mitigations and feature disablement may be faster than replacing the installed mobile binary

---

## 8. Rehearsal Checklist

Before launch, perform one controlled rehearsal:

1. Manually dispatch the `Deploy` workflow for Beta from a known-good ref.
2. Confirm GraphQL and WebSocket post-deploy probes pass.
3. Confirm the operational-alerts SNS path delivers a manual test message.
4. Practice a Vercel alias rollback on a non-critical deployment.
5. Record the exact operators, timings, and gaps found.

The runbook is not complete until this rehearsal happens.

---

## 9. What Is Still Not Covered

This runbook improves launch readiness, but it does not create:

- full backend blue/green deployment
- automatic PagerDuty or Slack routing
- iOS binary rollback automation
- automated rollback triggers

Those are valid future upgrades, but they are not the minimum bar for this beta.
