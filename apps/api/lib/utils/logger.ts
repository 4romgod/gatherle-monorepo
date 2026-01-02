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

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
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
   * Log GraphQL requests (uses DEBUG level)
   */
  graphql(operation: string, query: string, variables?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug('GraphQL request received:');
      this.debug(`  Operation: ${operation}`);
      if (query) {
        this.debug(`  Query:\n${query}`);
      }
      if (variables && Object.keys(variables).length > 0) {
        this.debug(`  Variables: ${JSON.stringify(variables, null, 2)}`);
      }
    }
  }
}

// Singleton instance
let loggerInstance: Logger;

export const initLogger = (level: LogLevel): void => {
  loggerInstance = new Logger(level);
};

export const getLogger = (): Logger => {
  if (!loggerInstance) {
    loggerInstance = new Logger(LogLevel.INFO);
  }
  return loggerInstance;
};

export const logger = {
  debug: (...args: Parameters<Logger['debug']>) => getLogger().debug(...args),
  info: (...args: Parameters<Logger['info']>) => getLogger().info(...args),
  warn: (...args: Parameters<Logger['warn']>) => getLogger().warn(...args),
  error: (...args: Parameters<Logger['error']>) => getLogger().error(...args),
  graphql: (...args: Parameters<Logger['graphql']>) => getLogger().graphql(...args),
};
