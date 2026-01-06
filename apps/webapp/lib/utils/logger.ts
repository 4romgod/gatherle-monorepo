/**
 * Logging utility for Next.js webapp with configurable log levels
 * Works in both server-side (Node.js) and client-side (browser) environments
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

class Logger {
  private level: LogLevel;
  private isServer: boolean;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.isServer = typeof window === 'undefined';
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private getEnvironmentPrefix(): string {
    if (this.isServer) {
      return '[SERVER]';
    }
    return '[CLIENT]';
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const envPrefix = this.getEnvironmentPrefix();
    const prefix = `${envPrefix} [${timestamp}] [${level}]`;
    
    if (args.length > 0) {
      console.log(prefix, message, ...args);
    } else {
      console.log(prefix, message);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.formatMessage('ERROR', message, ...args);
    }
  }

  /**
   * Log server actions (uses DEBUG level)
   */
  action(actionName: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`Server Action: ${actionName}`);
      if (context && Object.keys(context).length > 0) {
        this.debug(`  Context: ${JSON.stringify(context, null, 2)}`);
      }
    }
  }

  /**
   * Log GraphQL operations (uses DEBUG level)
   */
  graphql(operation: string, variables?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`GraphQL: ${operation}`);
      if (variables && Object.keys(variables).length > 0) {
        this.debug(`  Variables: ${JSON.stringify(variables, null, 2)}`);
      }
    }
  }
}

// Initialize with environment-based log level
const getDefaultLogLevel = (): LogLevel => {
  const env = process.env.NODE_ENV;
  const configuredLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;

  if (configuredLevel && LOG_LEVEL_MAP[configuredLevel.toLowerCase()]) {
    return LOG_LEVEL_MAP[configuredLevel.toLowerCase()];
  }

  // Default levels based on environment
  if (env === 'production') {
    return LogLevel.WARN; // Only warnings and errors in production
  } else if (env === 'test') {
    return LogLevel.ERROR; // Only errors in tests
  }
  
  return LogLevel.DEBUG; // Everything in development
};

// Singleton instance
let loggerInstance: Logger;

export const initLogger = (level?: LogLevel): void => {
  loggerInstance = new Logger(level ?? getDefaultLogLevel());
};

export const getLogger = (): Logger => {
  if (!loggerInstance) {
    loggerInstance = new Logger(getDefaultLogLevel());
  }
  return loggerInstance;
};

export const logger = {
  debug: (...args: Parameters<Logger['debug']>) => getLogger().debug(...args),
  info: (...args: Parameters<Logger['info']>) => getLogger().info(...args),
  warn: (...args: Parameters<Logger['warn']>) => getLogger().warn(...args),
  error: (...args: Parameters<Logger['error']>) => getLogger().error(...args),
  action: (...args: Parameters<Logger['action']>) => getLogger().action(...args),
  graphql: (...args: Parameters<Logger['graphql']>) => getLogger().graphql(...args),
};
