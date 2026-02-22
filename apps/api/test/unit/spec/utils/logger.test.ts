import { initLogger, logger, LogLevel } from '@/utils/logger';

describe('logger.graphql', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    initLogger(LogLevel.DEBUG, true);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('redacts sensitive GraphQL variable values and keeps only safe metadata', () => {
    logger.graphql({
      operation: 'Login',
      operationType: 'mutation',
      queryFingerprint: 'abc123',
      variableKeys: ['email', 'password', 'metadata'],
      variables: {
        email: 'user@example.com',
        password: 'my-raw-password',
        metadata: {
          accessToken: 'access-token',
          note: 'keep-this',
        },
      },
    });

    expect(logSpy).toHaveBeenCalledTimes(1);

    const jsonLog = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      message: string;
      context: {
        operation: string;
        operationType: string;
        queryFingerprint: string;
        variableKeys: string[];
        variables: {
          email: string;
          password: string;
          metadata: {
            accessToken: string;
            note: string;
          };
        };
        query?: string;
      };
    };

    expect(jsonLog.message).toBe('GraphQL request received');
    expect(jsonLog.context.operation).toBe('Login');
    expect(jsonLog.context.operationType).toBe('mutation');
    expect(jsonLog.context.queryFingerprint).toBe('abc123');
    expect(jsonLog.context.variableKeys).toEqual(['email', 'password', 'metadata']);
    expect(jsonLog.context.variables.email).toBe('[REDACTED]');
    expect(jsonLog.context.variables.password).toBe('[REDACTED]');
    expect(jsonLog.context.variables.metadata.accessToken).toBe('[REDACTED]');
    expect(jsonLog.context.variables.metadata.note).toBe('keep-this');
    expect(jsonLog.context.query).toBeUndefined();

    const fullLog = JSON.stringify(jsonLog);
    expect(fullLog).not.toContain('user@example.com');
    expect(fullLog).not.toContain('my-raw-password');
    expect(fullLog).not.toContain('access-token');
  });
});
