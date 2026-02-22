import { createGraphQLRequestLoggingPlugin } from '@/graphql/apollo/server';
import { logger } from '@/utils/logger';

describe('createGraphQLRequestLoggingPlugin', () => {
  let graphqlSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    graphqlSpy = jest.spyOn(logger, 'graphql').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    graphqlSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs GraphQL metadata without raw query text or variable values by default', async () => {
    const query = 'mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) }';
    const variables = { email: 'user@example.com', password: 'super-secret' };
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'Login',
      },
    } as any);

    await hooks?.didResolveOperation?.({
      request: { query, operationName: 'Login', variables },
      operationName: 'Login',
      operation: { operation: 'mutation' },
    } as any);

    expect(graphqlSpy).toHaveBeenCalledTimes(1);

    const payload = graphqlSpy.mock.calls[0][0] as {
      operation: string;
      operationType: string;
      queryFingerprint: string;
      variableKeys: string[];
      variables?: Record<string, unknown>;
      query?: string;
    };

    expect(payload.operation).toBe('Login');
    expect(payload.operationType).toBe('mutation');
    expect(payload.queryFingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(payload.variableKeys).toEqual(['email', 'password']);
    expect(payload.variables).toBeUndefined();
    expect(payload.query).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('super-secret');
    expect(JSON.stringify(payload)).not.toContain('user@example.com');
  });

  it('avoids raw query and variable values in pre-resolution error logs', async () => {
    const query = 'query Broken($token: String!) { broken(token: $token) }';
    const variables = { token: 'secret-token' };
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'Broken',
      },
    } as any);

    await hooks?.didEncounterErrors?.({
      request: { query, operationName: 'Broken', variables },
      operationName: 'Broken',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_PARSE_FAILED' } }],
    } as any);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'GraphQL request failed before operation resolution',
      expect.objectContaining({
        operation: 'Broken',
        queryFingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
        queryLength: query.length,
        variableKeys: ['token'],
      }),
    );

    const warnContext = warnSpy.mock.calls[0][1] as {
      query?: string;
      variables?: Record<string, unknown>;
    };

    expect(warnContext.query).toBeUndefined();
    expect(warnContext.variables).toBeUndefined();
    expect(JSON.stringify(warnContext)).not.toContain('secret-token');
  });
});
