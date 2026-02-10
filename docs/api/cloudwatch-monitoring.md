# CloudWatch Monitoring & Dashboard

## Overview

The Ntlango API has comprehensive CloudWatch monitoring with structured JSON logging, automatic error tracking, and a
real-time dashboard for observability.

## CloudWatch Dashboard

A CloudWatch dashboard is automatically deployed with each CDK stack deployment (`MonitoringDashboardStack`).

### Dashboard URL

Access the dashboard in AWS Console:

```
https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Ntlango-API-{STAGE}
```

Replace `{STAGE}` with your environment: `Beta`, `Staging`, or `Prod`.

### Dashboard Widgets

The dashboard includes the following widgets:

#### **Lambda Function Metrics**

- **Invocations**: Total number of Lambda invocations over time
- **Errors**: Lambda-level errors (5xx responses, timeouts, etc.)
- **Duration**: Average and maximum execution time

#### **Application Errors & Warnings**

- **Error Logs**: All ERROR-level logs from the last hour with request IDs, error names, and messages
- **Warning Logs**: All WARN-level logs from the last hour
- **Error Count Over Time**: 5-minute bins showing error frequency trends
- **Warning Count Over Time**: 5-minute bins showing warning frequency trends

#### **Error Analysis**

- **Top Error Messages**: Most frequent error messages (top 10)
- **Top Error Types**: Most common error types (e.g., `MongoError`, `ValidationError`, `GraphQLError`)

#### **Request Performance**

- **Slowest Requests**: Top 20 slowest requests with duration in milliseconds
- **Average Request Duration**: Average and maximum request duration over time

#### **API Gateway Access Logs**

- **Recent API Requests**: Last 50 API Gateway access log entries

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

## Alerting (Future Enhancement)

Consider adding CloudWatch Alarms for:

1. **High Error Rate**: Alert when error count exceeds threshold (e.g., >10 errors in 5 minutes)
2. **Lambda Throttling**: Alert when Lambda concurrent execution limits are reached
3. **Slow Requests**: Alert when average duration exceeds threshold (e.g., >5 seconds)
4. **Database Errors**: Alert on specific database connection errors

Example alarm configuration (add to `MonitoringDashboardStack`):

```typescript
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';

// Create alarm for high error rate
const errorAlarm = new Alarm(this, 'HighErrorRateAlarm', {
  metric: this.lambdaFunction.metricErrors({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
  alarmDescription: 'Alert when Lambda error count exceeds 10 in 5 minutes',
});
```

## Monitoring Best Practices

1. **Check the dashboard daily** for error trends and performance degradation
2. **Set up CloudWatch Alarms** for critical errors (see above)
3. **Use requestId** to trace issues across multiple log entries
4. **Export logs to S3** for long-term storage and analysis (if needed beyond retention period)
5. **Create custom metric filters** for business-specific metrics (e.g., user signups, event creations)

## Cost Optimization

- **Log Level**: Set `LOG_LEVEL=warn` in production to reduce log volume
- **Log Retention**: Keep retention periods short for non-critical environments
- **Sampling**: Consider sampling DEBUG logs at high traffic volumes

## Related Documentation

- [Logging Guide](./logging.md) - How to use the logger in application code
- [Environment Variables](../../docs/environment-variables.md) - Configuration options
