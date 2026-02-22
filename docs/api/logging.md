# Logger Usage Guide

## Overview

The API uses a centralized logging system with configurable log levels and CloudWatch-optimized structured JSON logging
for production environments.

## Key Features

- **Structured JSON logging** for CloudWatch Logs Insights queries
- **Request correlation** via automatic request ID tracking
- **Configurable log levels** to control verbosity
- **Environment-aware formatting** (JSON for production, human-readable for dev)
- **Automatic error serialization** with stack traces
- **GraphQL metadata logging with sensitive-value redaction**
- **CloudWatch dashboard** with error/warning widgets and metrics

## Log Levels

Logs are output based on severity, from most to least verbose:

- **`debug`**: Detailed information for debugging
- **`info`**: General informational messages (default)
- **`warn`**: Warning messages for potentially harmful situations
- **`error`**: Error messages for failures
- **`none`**: Disable all logging

## Configuration

Set the `LOG_LEVEL` environment variable:

```bash
# Development - see everything
LOG_LEVEL=debug

# Staging - see info and above
LOG_LEVEL=info

# Production - only warnings and errors
LOG_LEVEL=warn

# Disable all logs
LOG_LEVEL=none
```

**Default**: `info` if not specified

## Usage in Code

### Import the logger

```typescript
import { logger } from '@/utils/logger';
```

### Basic logging

```typescript
// Simple message
logger.info('Server started');

// Message with context
logger.info('User created', { userId: user.id, email: user.email });

// Warning with context
logger.warn('Rate limit approaching', { userId, requestCount: 95, limit: 100 });

// Error with error object (automatically serializes with stack trace)
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, userId, operation: 'riskyOperation' });
}
```

### Request correlation

The Lambda handler automatically sets a request ID for all logs within a request:

```typescript
// In Lambda handler (automatic)
logger.setRequestId(context.awsRequestId);

// All subsequent logs include the requestId
logger.info('Processing request'); // Includes requestId in output

// Cleared after request completes
logger.clearRequestId();
```

### GraphQL request logging

```typescript
// Logs only GraphQL metadata + optional redacted variables
logger.graphql({
  operation: 'GetAllEvents',
  operationType: 'query',
  queryFingerprint: 'f7b4e2c9a3d41ab0',
  variableKeys: ['pagination', 'filters'],
});
```

### When to use each level

**DEBUG**

- Database queries
- Detailed request/response payloads
- Internal state changes

**INFO**

- Application startup/shutdown
- Major lifecycle events
- Successful operations
- Configuration loaded

**WARN**

- Deprecated features used
- Recoverable errors
- Rate limiting triggered
- Missing optional configuration

**ERROR**

- Unhandled exceptions
- Database connection failures
- External service failures
- Critical business logic errors

## Examples by Environment

### Local Development

```bash
# See verbose debug logs
LOG_LEVEL=debug npm run dev
```

### CI/CD E2E Tests

```bash
# Only see info and above, skip debug noise
LOG_LEVEL=info npm run test:e2e
```

### Production Lambda

```bash
# Only warnings and errors to reduce CloudWatch costs
LOG_LEVEL=warn
```

## Log Format

The logger automatically uses the appropriate format based on the environment:

### Production/AWS Lambda (JSON)

Structured JSON for CloudWatch Logs Insights:

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

### Local Development (Human-readable)

Easy-to-read format for development:

```
[2026-02-10T10:30:45.123Z] [ERROR] [abc-123-def-456] Database connection failed { userId: 'user_123', error: ... }
```

### Format Selection

The logger automatically chooses JSON format when:

- Running in AWS Lambda (detects `AWS_EXECUTION_ENV`)
- `NODE_ENV=production`
- `STAGE` is not `Dev` (defaults to `Beta`)

Otherwise, it uses human-readable format for local development.

## CloudWatch Integration

### Dashboard

A CloudWatch dashboard is automatically created for each stage with widgets showing:

- **Error Logs**: All ERROR level logs from the last hour
- **Warning Logs**: All WARN level logs from the last hour
- **Error Count Over Time**: 5-minute bins showing error frequency
- **Warning Count Over Time**: 5-minute bins showing warning frequency
- **Top Error Messages**: Most common error messages
- **Top Error Types**: Most common error types (e.g., `MongoError`, `ValidationError`)
- **Lambda Metrics**: Invocations, errors, and duration
- **Request Performance**: Slowest requests and average duration trends
- **API Gateway Access Logs**: Recent API requests

### Querying Logs

CloudWatch Logs Insights queries work seamlessly with structured JSON logs:

```
# Find all errors for a specific user
fields @timestamp, message, context.error.message
| filter level = "ERROR" and context.userId = "user_123"
| sort @timestamp desc

# Count errors by type
fields context.error.name as errorType
| filter level = "ERROR"
| stats count() by errorType

# Find slow requests
fields @timestamp, requestId, context.durationMs
| filter message = "Lambda handler execution completed"
| filter context.durationMs > 3000
| sort context.durationMs desc

# Trace a specific request
fields @timestamp, level, message, context
| filter requestId = "abc-123-def-456"
| sort @timestamp asc
```

### Log Retention

- **Production**: 30 days
- **Dev/Staging**: 7 days

### Console Methods

The logger uses the appropriate `console` method for each level, allowing CloudWatch to properly categorize logs:

- `DEBUG` → `console.log()`
- `INFO` → `console.log()`
- `WARN` → `console.warn()` ⚠️ Shows as WARNING in CloudWatch
- `ERROR` → `console.error()` 🔴 Shows as ERROR in CloudWatch

## Migration from console.log

**❌ Never use `console.log`, `console.error`, or `console.warn` directly** (except in test files or build scripts)

**Before:**

```typescript
console.log('User created:', user);
console.warn('Missing optional field');
console.error('Failed to save:', error);
```

**After:**

```typescript
logger.info('User created', { userId: user.id });
logger.warn('Missing optional field', { field: 'avatar' });
logger.error('Failed to save', { error, operation: 'saveUser' });
```

## Best Practices

1. **Always include context**: Add relevant IDs, operation names, and metadata

   ```typescript
   // ❌ Bad
   logger.error('Save failed');

   // ✅ Good
   logger.error('Save failed', {
     error,
     userId: user.id,
     operation: 'createUser',
     email: user.email,
   });
   ```

2. **Use structured context objects**: Don't concatenate strings

   ```typescript
   // ❌ Bad
   logger.info(`User ${userId} created event ${eventId}`);

   // ✅ Good
   logger.info('User created event', { userId, eventId });
   ```

3. **Pass error objects in context**: The logger will automatically extract name, message, and stack

   ```typescript
   // ❌ Bad
   logger.error(`Error: ${error.message}`);

   // ✅ Good
   logger.error('Operation failed', { error, additionalContext });
   ```

4. **Set appropriate log levels**: Production should use `warn` or `error` to reduce costs

   ```typescript
   // ❌ Bad - leaves debug logging in production
   LOG_LEVEL = debug;

   // ✅ Good - only critical logs in production
   LOG_LEVEL = warn;
   ```

5. **Don't log sensitive data**: Avoid passwords, tokens, full credit card numbers, etc.

   ```typescript
   // ❌ Bad
   logger.info('User login', { email, password });

   // ✅ Good
   logger.info('User login', { userId });
   ```

## Performance Considerations

- Log statements are **skipped** if below the configured level (no string interpolation or serialization)
- Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production to reduce CloudWatch costs
- GraphQL introspection queries are automatically filtered out
- GraphQL operation logs store query fingerprints and variable keys, not raw query text
