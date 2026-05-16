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

  it('infers the named operation from the query text when operationName is omitted', async () => {
    const query = 'query GetHomeDiscovery { __typename }';
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
      },
    } as any);

    await hooks?.didResolveOperation?.({
      request: { query, variables: {} },
      operation: { operation: 'query' },
    } as any);

    expect(graphqlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'GetHomeDiscovery',
      }),
    );
  });

  it('suppresses request logging for introspection queries', async () => {
    const query = 'query IntrospectionQuery { __schema { queryType { name } } }';
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'IntrospectionQuery',
      },
    } as any);

    await hooks?.didResolveOperation?.({
      request: { query, operationName: 'IntrospectionQuery', variables: {} },
      operationName: 'IntrospectionQuery',
      operation: { operation: 'query' },
    } as any);

    await hooks?.didEncounterErrors?.({
      request: { query, operationName: 'IntrospectionQuery', variables: {} },
      operationName: 'IntrospectionQuery',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
    } as any);

    expect(debugSpy).not.toHaveBeenCalled();
    expect(graphqlSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not emit a pre-resolution warning after the operation has already been resolved', async () => {
    const query = 'query Viewer { __typename }';
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'Viewer',
      },
    } as any);

    await hooks?.didResolveOperation?.({
      request: { query, operationName: 'Viewer', variables: {} },
      operationName: 'Viewer',
      operation: { operation: 'query' },
    } as any);

    await hooks?.didEncounterErrors?.({
      request: { query, operationName: 'Viewer', variables: {} },
      operationName: 'Viewer',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
    } as any);

    expect(graphqlSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a pre-resolution warning only once even if multiple early errors are reported', async () => {
    const query = 'query Broken($token: String!) { broken(token: $token) }';
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'Broken',
      },
    } as any);

    const requestContext = {
      request: { query, operationName: 'Broken', variables: { token: 'secret-token' } },
      operationName: 'Broken',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
    } as any;

    await hooks?.didEncounterErrors?.(requestContext);
    await hooks?.didEncounterErrors?.(requestContext);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
