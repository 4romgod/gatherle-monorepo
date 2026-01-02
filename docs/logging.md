# Logger Usage Guide

## Overview
The API uses a centralized logging system with configurable log levels to control verbosity across all environments.

## Log Levels
Logs are output based on severity, from most to least verbose:

- **`debug`**: Detailed information for debugging (includes GraphQL queries, variables, etc.)
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
import {logger} from '@/utils/logger';
```

### Basic logging
```typescript
logger.debug('Detailed debug information', {userId, query});
logger.info('Server started on port 4000');
logger.warn('Deprecated API endpoint called', {endpoint});
logger.error('Database connection failed', error);
```

### GraphQL request logging
```typescript
// Automatically logs GraphQL requests at DEBUG level
logger.graphql('GetAllEvents', queryString, variables);
```

### When to use each level

**DEBUG**
- GraphQL queries and responses
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
# See all GraphQL queries and debug info
LOG_LEVEL=debug npm run dev
```

### CI/CD Integration Tests
```bash
# Only see info and above, skip debug noise
LOG_LEVEL=info npm run test:integration
```

### Production Lambda
```bash
# Only warnings and errors to reduce CloudWatch costs
LOG_LEVEL=warn
```

## Log Format
All logs include ISO timestamps and level indicators:
```
[2026-01-02T10:30:45.123Z] [INFO] Server started on port 4000
[2026-01-02T10:30:46.456Z] [DEBUG] GraphQL request received:
[2026-01-02T10:30:46.456Z] [DEBUG]   Operation: GetAllEvents
```

## Migration from console.log

**Before:**
```typescript
console.log('User created:', user);
console.warn('Missing optional field');
console.error('Failed to save:', error);
```

**After:**
```typescript
logger.info('User created:', user);
logger.warn('Missing optional field');
logger.error('Failed to save:', error);
```

## Performance Considerations

- Log statements are **skipped** if below the configured level (no string interpolation or serialization)
- Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production to reduce CloudWatch costs
- GraphQL introspection queries are automatically filtered out even at DEBUG level
