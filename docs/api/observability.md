# API Observability Guide

This document consolidates Gatherle's API logging and CloudWatch monitoring guidance into one operational reference.

It covers:

- application logging conventions
- request correlation and GraphQL-safe logging
- CloudWatch dashboards, metrics, and alerts
- Logs Insights queries for day-to-day debugging
- retention and cost controls

---

## Overview

The Gatherle API uses a centralized logger plus CloudWatch dashboards so engineers can answer three questions quickly:

1. What happened?
2. Which request or user was involved?
3. Is this a one-off failure or a system trend?

The current setup emphasizes:

- structured JSON logs for CloudWatch Logs Insights
- request-level correlation IDs
- environment-aware log formatting
- redaction-friendly GraphQL logging
- dashboard widgets for Lambda, API, query guards, and occurrence maintenance health

---

## Logging

### Logging goals

- Keep production logs queryable and structured.
- Make local development logs easy to read.
- Preserve request context without leaking sensitive GraphQL payloads.
- Keep log volume low enough to control CloudWatch cost.

### Log levels

From most to least verbose:

- `debug`
- `info`
- `warn`
- `error`
- `none`

Recommended defaults:

- local dev: `LOG_LEVEL=debug`
- CI and staging: `LOG_LEVEL=info`
- production: `LOG_LEVEL=warn`

If unset, the logger defaults to `info`.

### How to use the logger

```typescript
import { logger } from '@/utils/logger';

logger.info('Server started');

logger.warn('Rate limit approaching', {
  userId,
  requestCount: 95,
  limit: 100,
});

try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    userId,
    error,
  });
}
```

### Request correlation

The API sets a request ID for each request lifecycle so related log lines can be traced together.

```typescript
logger.setRequestId(context.awsRequestId);
logger.info('Processing request');
logger.clearRequestId();
```

Use the request ID when:

- tracing a single failed GraphQL request
- connecting Lambda errors to downstream DAO logs
- investigating retries or duplicated websocket activity

### GraphQL request logging

GraphQL logging should capture metadata, not raw sensitive payloads.

Canonical pattern:

```typescript
logger.graphql({
  operation: 'GetAllEvents',
  operationType: 'query',
  queryFingerprint: 'f7b4e2c9a3d41ab0',
  variableKeys: ['pagination', 'filters'],
});
```

Important rule:

- log operation name, type, fingerprint, and variable keys
- do not log raw variable values
- do not log full query text in production request-path logs

### When to use each level

`debug`

- detailed DAO or resolver behavior
- temporary instrumentation during investigations
- local-only state inspection
- expected client and business-logic failures that are useful during local debugging but too noisy for CloudWatch
  warnings

`info`

- startup and shutdown events
- major application lifecycle steps
- successful but significant operations

`warn`

- recoverable failures
- abuse-control events
- retry paths
- missing optional configuration
- query guard rejections and throttle-style client rejections that operators may want to trend

`error`

- unhandled exceptions
- downstream service failures
- request failures that require operator attention

Important distinction:

- ordinary GraphQL client outcomes such as `UNAUTHENTICATED`, `NOT_FOUND`, `BAD_USER_INPUT`, and `CONFLICT` should not
  pollute the CloudWatch warning stream
- reserve `warn` for signals an operator may actually care about, such as throttling, abuse-control events, and query
  guard rejections

---

## Log Format

### Production and Lambda

Production logs should be structured JSON:

```json
{
  "timestamp": "2026-02-10T10:30:45.123Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "requestId": "abc-123-def-456",
  "context": {
    "userId": "user_123",
    "operation": "createUser"
  },
  "error": {
    "name": "MongoError",
    "message": "Connection timeout",
    "stack": "MongoError: Connection timeout\n    at..."
  }
}
```

### Local development

Local logs stay human-readable:

```text
[2026-02-10T10:30:45.123Z] [ERROR] [abc-123-def-456] Database connection failed { userId: 'user_123', error: ... }
```

### Format selection

The logger uses JSON formatting when any of the following is true:

- running in AWS Lambda
- `NODE_ENV=production`
- `STAGE` is not `Dev`

Otherwise it uses the local readable format.

---

## CloudWatch Monitoring

### Dashboard deployment

A CloudWatch dashboard is deployed with the monitoring stack for each stage.

Console URL pattern:

```text
https://console.aws.amazon.com/cloudwatch/home?region=<region>#dashboards:name=Gatherle-API-<STAGE>
```

### Core dashboard widgets

#### Lambda and request-path health

- invocations
- Lambda errors
- duration percentiles (`p50`, `p95`, `p99`)
- cold starts
- Lambda throttles
- concurrent executions

#### Application logs

- recent `ERROR` logs
- recent `WARN` logs
- top error messages
- top error types

#### API Gateway

- request rate
- status code distribution
- response size distribution

#### Query guard metrics

- `QueryComplexity`
- `QueryDepth`
- `QueryGuardAccepted`
- `QueryGuardRejected`
- high-complexity operation table

Operational note:

- production-facing operation widgets should use real product operation names from web and mobile clients
- synthetic probes and guard tests should use a `Synthetic...` prefix and be excluded from the dashboard leaderboards
- malformed requests that fail before operation resolution should use a readable fallback such as
  `InvalidGraphQLRequest`, not placeholder strings like `<unresolved>`

#### Event occurrence maintenance

- remaining missing series
- remaining low-horizon series
- remaining metadata-repair series
- remaining drifted occurrences
- maintenance alarm widget

Operational note:

- the occurrence-maintenance log widget should filter out EMF-only metric records so operators see the structured
  lifecycle and summary logs rather than empty rows
- operator-facing run summaries should include batch counts, sync counts, remaining maintenance debt, and duration

### Alarm naming and threshold philosophy

CloudWatch alarm names should be concise and stable.

Examples:

- `GraphqlApi4xxSpike`
- `GraphqlLoginLockouts`
- `OccurrenceMaintenanceDrift`
- `WebSocketExecutionErrorSpike`

Avoid generated CloudFormation-style names in the CloudWatch UI whenever a plain `alarmName` is sufficient.

Threshold guidance:

- use thresholds that catch sustained abnormal behavior, not ordinary product traffic
- prefer `2 of 3` datapoints for spiky transport and abuse metrics
- reserve `1 of 1` alarms for low-volume but high-signal conditions such as maintenance jobs failing to run

### What the dashboard is for

Use the dashboard to spot:

- rising error rates after deploys
- slow or expensive GraphQL operations
- sudden traffic spikes or throttles
- query-guard rejects from abuse or client regressions
- recurring-event maintenance drift

---

## Logs Insights Queries

### Errors for one user

```text
fields @timestamp, message, context.error.message
| filter level = "ERROR" and context.userId = "user_123"
| sort @timestamp desc
```

### Count errors by type

```text
fields context.error.name as errorType
| filter level = "ERROR"
| stats count() by errorType
```

### Slow requests over 3 seconds

```text
fields @timestamp, requestId, context.durationMs
| filter message = "Lambda handler execution completed"
| filter context.durationMs > 3000
| sort context.durationMs desc
```

### Trace one request

```text
fields @timestamp, level, message, context
| filter requestId = "abc-123-def-456"
| sort @timestamp asc
```

### GraphQL errors

```text
fields @timestamp, message, context.error.name, context.operation
| filter level = "ERROR"
| filter message like /GraphQL/
| sort @timestamp desc
```

### MongoDB query performance

```text
fields @timestamp, context.durationMs, context.operation
| filter message like /MongoDB query/
| stats avg(context.durationMs) as avgMs, max(context.durationMs) as maxMs by context.operation
| sort avgMs desc
```

---

## Alerts And Retention

### Log retention

- production: 30 days
- non-production: 7 days

Retention is managed by CDK.

### Current alarms

Occurrence maintenance alarms already exist for:

- maintenance Lambda failures
- missing occurrence series after maintenance
- low-horizon recurring series after maintenance
- occurrence/participant drift after maintenance
- no successful maintenance run in the last 24 hours

GraphQL and WebSocket monitoring also surfaces traffic, throttle, error, and abuse-related metrics through the shared
monitoring dashboards.

### Recommended next alarms

- WAF blocked-request spikes
- API Gateway spend anomalies
- Lambda spend anomalies
- CloudWatch log-ingestion spikes
- websocket send-failure anomalies

---

## Operating Guidelines

### Daily or release-time checks

1. Check the dashboard after each deploy.
2. Review recent `ERROR` and `WARN` logs for new patterns.
3. Watch query guard reject rates after GraphQL client changes.
4. Review occurrence maintenance health after schema or recurrence changes.

### Cost controls

- keep production at `LOG_LEVEL=warn` unless investigating
- keep retention short outside production
- avoid verbose debug logging on hot paths
- prefer structured fields over dumping large objects

### Debugging workflow

1. Start from the dashboard or an alarm.
2. Grab a `requestId`, user ID, or operation name.
3. Use Logs Insights to isolate the request or trend.
4. Correlate with Lambda duration, API Gateway status, and query-guard metrics.

---

## Related Docs

- [Domain Data Model](./data-model.md)
- [Event Occurrence Maintenance](./event-occurrence-maintenance.md)
- [WebSocket Adoption Plan](./websocket-adoption-plan.md)
- [Environment & Secrets Reference](../environment-variables.md)
