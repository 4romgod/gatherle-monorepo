/**
 * Logging utility with configurable log levels
 *
 * Log levels (in order of severity):
 * - DEBUG: Detailed information for debugging
 * - INFO: General informational messages
 * - WARN: Warning messages for potentially harmful situations
 * - ERROR: Error messages for failures
 * - NONE: Disable all logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  none: LogLevel.NONE,
};

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private level: LogLevel;
  private requestId?: string;
  private useJson: boolean;

  constructor(level: LogLevel = LogLevel.INFO, useJson: boolean = true) {
    this.level = level;
    this.useJson = useJson;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  clearRequestId(): void {
    this.requestId = undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatError(error: any): LogEntry['error'] | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'object' && error.message) {
      return {
        name: error.name || 'Error',
        message: error.message,
        stack: error.stack,
      };
    }

    return undefined;
  }

  private formatMessage(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();

    if (this.useJson) {
      // Structured JSON logging for CloudWatch
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
      };

      if (this.requestId) {
        logEntry.requestId = this.requestId;
      }

      if (context) {
        // Check if context contains an error object
        const error = context.error || (context instanceof Error ? context : undefined);
        const formattedError = this.formatError(error);

        if (formattedError) {
          logEntry.error = formattedError;
          // Remove error from context to avoid duplication
          const { error: _err, ...restContext } = context as any;
          if (Object.keys(restContext).length > 0) {
            logEntry.context = restContext;
          }
        } else {
          logEntry.context = context;
        }
      }

      const output = JSON.stringify(logEntry);

      // Use appropriate console method for CloudWatch log level detection
      switch (level) {
        case 'ERROR':
          console.error(output);
          break;
        case 'WARN':
          console.warn(output);
          break;
        default:
          console.log(output);
      }
    } else {
      // Human-readable format for local development
      const prefix = `[${timestamp}] [${level}]`;
      if (this.requestId) {
        console.log(`${prefix} [${this.requestId}]`, message, context || '');
      } else {
        console.log(prefix, message, context || '');
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.formatMessage('ERROR', message, context);
    }
  }

  /**
   * Log GraphQL requests (uses INFO level for operational visibility)
   */
  graphql(operation: string, query: string, variables?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.info('GraphQL request received', {
        operation,
        query,
        variables,
      });
    }
  }
}

// Singleton instance
let loggerInstance: Logger;

export const initLogger = (level: LogLevel, useJson: boolean = true): void => {
  loggerInstance = new Logger(level, useJson);
};

export const getLogger = (): Logger => {
  if (!loggerInstance) {
    loggerInstance = new Logger(LogLevel.INFO, true);
  }
  return loggerInstance;
};

export const logger = {
  debug: (...args: Parameters<Logger['debug']>) => getLogger().debug(...args),
  info: (...args: Parameters<Logger['info']>) => getLogger().info(...args),
  warn: (...args: Parameters<Logger['warn']>) => getLogger().warn(...args),
  error: (...args: Parameters<Logger['error']>) => getLogger().error(...args),
  graphql: (...args: Parameters<Logger['graphql']>) => getLogger().graphql(...args),
  setRequestId: (requestId: string) => getLogger().setRequestId(requestId),
  clearRequestId: () => getLogger().clearRequestId(),
};
