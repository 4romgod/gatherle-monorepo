import { LogLevel, LOG_LEVEL_MAP, logger, initLogger, getLogger } from '@/lib/utils/logger';

describe('Logger Utilities', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    // Reset logger to ensure fresh state
    initLogger(LogLevel.DEBUG);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('LogLevel enum', () => {
    it('should have DEBUG as lowest level (0)', () => {
      expect(LogLevel.DEBUG).toBe(0);
    });

    it('should have INFO as second level (1)', () => {
      expect(LogLevel.INFO).toBe(1);
    });

    it('should have WARN as third level (2)', () => {
      expect(LogLevel.WARN).toBe(2);
    });

    it('should have ERROR as fourth level (3)', () => {
      expect(LogLevel.ERROR).toBe(3);
    });

    it('should have NONE as highest level (4)', () => {
      expect(LogLevel.NONE).toBe(4);
    });

    it('should maintain correct ordering for log level filtering', () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
    });
  });

  describe('LOG_LEVEL_MAP', () => {
    it('should map "debug" string to DEBUG level', () => {
      expect(LOG_LEVEL_MAP['debug']).toBe(LogLevel.DEBUG);
    });

    it('should map "info" string to INFO level', () => {
      expect(LOG_LEVEL_MAP['info']).toBe(LogLevel.INFO);
    });

    it('should map "warn" string to WARN level', () => {
      expect(LOG_LEVEL_MAP['warn']).toBe(LogLevel.WARN);
    });

    it('should map "error" string to ERROR level', () => {
      expect(LOG_LEVEL_MAP['error']).toBe(LogLevel.ERROR);
    });

    it('should map "none" string to NONE level', () => {
      expect(LOG_LEVEL_MAP['none']).toBe(LogLevel.NONE);
    });

    it('should return undefined for invalid level strings', () => {
      expect(LOG_LEVEL_MAP['invalid']).toBeUndefined();
      expect(LOG_LEVEL_MAP['WARNING']).toBeUndefined(); // Case sensitive
    });
  });

  describe('logger.debug', () => {
    it('should log when level is DEBUG', () => {
      initLogger(LogLevel.DEBUG);
      logger.debug('Test debug message');
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][1]).toBe('Test debug message');
    });

    it('should not log when level is INFO or higher', () => {
      initLogger(LogLevel.INFO);
      logger.debug('Test debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log with additional arguments', () => {
      initLogger(LogLevel.DEBUG);
      const extraData = { userId: '123' };
      logger.debug('Debug with data', extraData);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Debug with data', extraData);
    });
  });

  describe('logger.info', () => {
    it('should log when level is DEBUG', () => {
      initLogger(LogLevel.DEBUG);
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log when level is INFO', () => {
      initLogger(LogLevel.INFO);
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log when level is WARN or higher', () => {
      initLogger(LogLevel.WARN);
      logger.info('Test info message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('logger.warn', () => {
    it('should log when level is DEBUG', () => {
      initLogger(LogLevel.DEBUG);
      logger.warn('Test warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log when level is WARN', () => {
      initLogger(LogLevel.WARN);
      logger.warn('Test warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log when level is ERROR or higher', () => {
      initLogger(LogLevel.ERROR);
      logger.warn('Test warning message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('logger.error', () => {
    it('should log when level is DEBUG', () => {
      initLogger(LogLevel.DEBUG);
      logger.error('Test error message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log when level is ERROR', () => {
      initLogger(LogLevel.ERROR);
      logger.error('Test error message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log when level is NONE', () => {
      initLogger(LogLevel.NONE);
      logger.error('Test error message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('logger.action', () => {
    it('should log action name at DEBUG level', () => {
      initLogger(LogLevel.DEBUG);
      logger.action('updateUserProfile');
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][1]).toContain('Server Action: updateUserProfile');
    });

    it('should log action with context at DEBUG level', () => {
      initLogger(LogLevel.DEBUG);
      logger.action('updateUserProfile', { userId: '123' });
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[1][1]).toContain('Context');
    });

    it('should not log action when level is INFO or higher', () => {
      initLogger(LogLevel.INFO);
      logger.action('updateUserProfile');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('logger.graphql', () => {
    it('should log GraphQL operation at DEBUG level', () => {
      initLogger(LogLevel.DEBUG);
      logger.graphql('GetAllEvents');
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][1]).toContain('GraphQL: GetAllEvents');
    });

    it('should log GraphQL with variables at DEBUG level', () => {
      initLogger(LogLevel.DEBUG);
      logger.graphql('GetEventById', { eventId: '456' });
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[1][1]).toContain('Variables');
    });

    it('should not log GraphQL when level is INFO or higher', () => {
      initLogger(LogLevel.INFO);
      logger.graphql('GetAllEvents');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('initLogger and getLogger', () => {
    it('should initialize logger with specified level', () => {
      initLogger(LogLevel.WARN);
      logger.info('Should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();

      logger.warn('Should appear');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should return singleton instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    it('should reinitialize when initLogger is called again', () => {
      initLogger(LogLevel.DEBUG);
      logger.debug('Should appear');
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      initLogger(LogLevel.ERROR);
      logger.debug('Should not appear');
      expect(consoleSpy).toHaveBeenCalledTimes(1); // No new calls
    });
  });

  describe('log message formatting', () => {
    it('should include timestamp in log messages', () => {
      initLogger(LogLevel.DEBUG);
      logger.debug('Test message');

      const logCall = consoleSpy.mock.calls[0][0];
      // Should contain ISO timestamp format
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include environment prefix (SERVER or CLIENT)', () => {
      initLogger(LogLevel.DEBUG);
      logger.debug('Test message');

      const logCall = consoleSpy.mock.calls[0][0];
      // In jsdom test environment, window is defined so it should be CLIENT
      expect(logCall).toMatch(/\[(SERVER|CLIENT)\]/);
    });

    it('should include log level in prefix', () => {
      initLogger(LogLevel.DEBUG);
      logger.debug('Test');
      expect(consoleSpy.mock.calls[0][0]).toContain('[DEBUG]');

      logger.info('Test');
      expect(consoleSpy.mock.calls[1][0]).toContain('[INFO]');

      logger.warn('Test');
      expect(consoleSpy.mock.calls[2][0]).toContain('[WARN]');

      logger.error('Test');
      expect(consoleSpy.mock.calls[3][0]).toContain('[ERROR]');
    });
  });
});
