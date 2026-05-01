# CloudWatch Monitoring & Dashboard

## Overview

The Gatherle API has comprehensive CloudWatch monitoring with structured JSON logging, automatic error tracking, and a
real-time dashboard for observability.

## CloudWatch Dashboard

A CloudWatch dashboard is automatically deployed with each CDK stack deployment (`MonitoringDashboardStack`).

### Dashboard URL

Access the dashboard in AWS Console:

```
https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Gatherle-API-{STAGE}
```

Replace `{STAGE}` with your environment: `Beta`, `Staging`, or `Prod`.

### Dashboard Widgets

The dashboard includes the following widgets:

#### **Lambda Function Metrics**

- **Invocations**: Total number of Lambda invocations over time
- **Errors**: Lambda-level errors (5xx responses, timeouts, etc.)
- **Duration**: P50, P95, and P99 percentiles for performance analysis
- **Occurrence Maintenance Lambda**: scheduled maintenance invocations, errors, and duration

#### **Application Errors & Warnings**

- **Error Logs**: All ERROR-level logs with request IDs, error names, and messages
- **Warning Logs**: All WARN-level logs with request IDs, error names, and messages

#### **Request Performance**

- **Cold Starts Detected**: Lambda initialization overhead per 5-minute interval
- **Lambda Throttles**: Sum of throttled Lambda requests (indicates concurrency limit issues)

#### **Error Patterns**

- **Error Types Distribution**: Pie chart showing proportional breakdown of all error types

#### **API Gateway Metrics**

- **Request Rate**: Total requests per 5-minute interval (line chart)
- **Response Status Codes**: Distribution of HTTP status codes (200, 404, 500, etc.)
- **Response Size Distribution**: Average, max, and min response payload sizes over time
- **Concurrent Executions**: Lambda invocations per minute to identify traffic spikes

#### **Occurrence Maintenance Health**

- **Remaining Missing Series**: series that still have no persisted occurrence window after maintenance
- **Remaining Low-Horizon Series**: recurring series still too close to the maintenance horizon after maintenance
- **Remaining Metadata Repair Series**: series whose occurrences still lack denormalized metadata snapshots
- **Remaining Drifted Occurrences**: occurrences whose reserved-slot counter still disagrees with participant state
- **Occurrence Maintenance Alerts**: alarm widget for maintenance failures and remaining health issues

## Log Structure

All logs are output as structured JSON for easy querying in CloudWatch Logs Insights:

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

## CloudWatch Logs Insights Queries

### Find all errors for a specific user

```
fields @timestamp, message, context.error.message
| filter level = "ERROR" and context.userId = "user_123"
| sort @timestamp desc
```

### Count errors by type

```
fields context.error.name as errorType
| filter level = "ERROR"
| stats count() by errorType
```

### Find slow requests (>3 seconds)

```
fields @timestamp, requestId, context.durationMs
| filter message = "Lambda handler execution completed"
| filter context.durationMs > 3000
| sort context.durationMs desc
```

### Trace all logs for a specific request

```
fields @timestamp, level, message, context
| filter requestId = "abc-123-def-456"
| sort @timestamp asc
```

### Find all GraphQL errors

```
fields @timestamp, message, context.error.name, context.operation
| filter level = "ERROR"
| filter message like /GraphQL/
| sort @timestamp desc
```

### Monitor database query performance

```
fields @timestamp, context.durationMs, context.operation
| filter message like /MongoDB query/
| stats avg(context.durationMs) as avgMs, max(context.durationMs) as maxMs by context.operation
| sort avgMs desc
```

## Log Retention

- **Production**: 30 days
- **Dev/Staging**: 7 days

Log retention is managed by CDK and configured in the `GraphQLStack`.

## Alerting

CloudWatch alarms are now created for:

1. **Occurrence maintenance Lambda failures**
2. **Missing occurrence series remaining after maintenance**
3. **Low-horizon recurring series remaining after maintenance**
4. **Occurrence/participant drift remaining after maintenance**
5. **No successful maintenance run in the last 24 hours**

The GraphQL/WebSocket request-path alarms still remain a future expansion if you want threshold-based alerting on API
latency, throttles, or error rates.

## Monitoring Best Practices

1. **Check the dashboard daily** for error trends and performance degradation
2. **Set up CloudWatch Alarms** for critical errors (see above)
3. **Use requestId** to trace issues across multiple log entries
4. **Export logs to S3** for long-term storage and analysis (if needed beyond retention period)
5. **Create custom metric filters** for business-specific metrics (e.g., user signups, event creations)
6. **Review occurrence maintenance health metrics** after deploys and schema changes

## Cost Optimization

- **Log Level**: Set `LOG_LEVEL=warn` in production to reduce log volume
- **Log Retention**: Keep retention periods short for non-critical environments
- **Sampling**: Consider sampling DEBUG logs at high traffic volumes

## Related Documentation

- [Logging Guide](./logging.md) - How to use the logger in application code
- [Environment Variables](../../docs/environment-variables.md) - Configuration options
