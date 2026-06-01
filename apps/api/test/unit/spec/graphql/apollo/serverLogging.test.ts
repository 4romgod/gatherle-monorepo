import { createGraphQLRequestLoggingPlugin, shouldWarnForGraphqlClientError } from '@/graphql/apollo/server';
import { QUERY_GUARD_ERROR_CODES } from '@/graphql/security';
import { logger } from '@/utils/logger';

describe('createGraphQLRequestLoggingPlugin', () => {
  const getDebugCallsFor = (message: string) => debugSpy.mock.calls.filter(([entry]) => entry === message);
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
    const query = 'query SyntheticInvalidGraphqlSyntax($token: String!) { broken(token: $token) }';
    const variables = { token: 'secret-token' };
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'SyntheticInvalidGraphqlSyntax',
      },
    } as any);

    await hooks?.didEncounterErrors?.({
      request: { query, operationName: 'SyntheticInvalidGraphqlSyntax', variables },
      operationName: 'SyntheticInvalidGraphqlSyntax',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_PARSE_FAILED' } }],
    } as any);

    const preResolutionCalls = getDebugCallsFor('GraphQL request failed before operation resolution');
    expect(preResolutionCalls).toHaveLength(1);
    expect(debugSpy).toHaveBeenCalledWith(
      'GraphQL request failed before operation resolution',
      expect.objectContaining({
        operation: 'SyntheticInvalidGraphqlSyntax',
        queryFingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
        queryLength: query.length,
        variableKeys: ['token'],
      }),
    );

    const warnContext = preResolutionCalls[0][1] as {
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
    expect(getDebugCallsFor('GraphQL request failed before operation resolution')).toHaveLength(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a pre-resolution debug entry only once even if multiple early errors are reported', async () => {
    const query = 'query SyntheticInvalidGraphqlSyntax($token: String!) { broken(token: $token) }';
    const plugin = createGraphQLRequestLoggingPlugin();

    const hooks = await plugin.requestDidStart?.({
      request: {
        query,
        operationName: 'SyntheticInvalidGraphqlSyntax',
      },
    } as any);

    const requestContext = {
      request: { query, operationName: 'SyntheticInvalidGraphqlSyntax', variables: { token: 'secret-token' } },
      operationName: 'SyntheticInvalidGraphqlSyntax',
      operation: undefined,
      errors: [{ extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
    } as any;

    await hooks?.didEncounterErrors?.(requestContext);
    await hooks?.didEncounterErrors?.(requestContext);

    expect(getDebugCallsFor('GraphQL request failed before operation resolution')).toHaveLength(1);
  });

  describe('shouldWarnForGraphqlClientError', () => {
    it('keeps query guard violations at warn level', () => {
      expect(shouldWarnForGraphqlClientError('BAD_REQUEST', 400, QUERY_GUARD_ERROR_CODES.MAX_COMPLEXITY_EXCEEDED)).toBe(
        true,
      );
      expect(shouldWarnForGraphqlClientError('BAD_REQUEST', 400, QUERY_GUARD_ERROR_CODES.MAX_DEPTH_EXCEEDED)).toBe(
        true,
      );
      expect(shouldWarnForGraphqlClientError('BAD_REQUEST', 400, QUERY_GUARD_ERROR_CODES.INTROSPECTION_DISABLED)).toBe(
        true,
      );
    });

    it('keeps throttle-style client rejections at warn level', () => {
      expect(shouldWarnForGraphqlClientError('TOO_MANY_REQUESTS', 429)).toBe(true);
    });

    it('downgrades ordinary client/business errors out of the warn stream', () => {
      expect(shouldWarnForGraphqlClientError('NOT_FOUND', 404)).toBe(false);
      expect(shouldWarnForGraphqlClientError('UNAUTHENTICATED', 401)).toBe(false);
      expect(shouldWarnForGraphqlClientError('GRAPHQL_VALIDATION_FAILED', 400)).toBe(false);
    });
  });
});
