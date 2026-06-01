import { parse, type OperationDefinitionNode } from 'graphql';
import { createGraphqlQueryGuardMetricsPlugin } from '@/graphql/apollo/server';
import { emitGraphqlQueryGuardMetrics } from '@/utils/graphqlQueryGuardMetrics';

jest.mock('@/utils/graphqlQueryGuardMetrics', () => {
  const actual = jest.requireActual('@/utils/graphqlQueryGuardMetrics');
  return {
    ...actual,
    emitGraphqlQueryGuardMetrics: jest.fn(),
  };
});

const getOperation = (source: string): { document: ReturnType<typeof parse>; operation: OperationDefinitionNode } => {
  const document = parse(source);
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode => definition.kind === 'OperationDefinition',
  );

  if (!operation) {
    throw new Error('Expected operation definition in test query');
  }

  return { document, operation };
};

describe('createGraphqlQueryGuardMetricsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits accepted metrics for a valid query', async () => {
    const { document, operation } = getOperation(`
      query Viewer {
        readUserById(userId: "user-1") {
          userId
          username
        }
      }
    `);
    const plugin = createGraphqlQueryGuardMetricsPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await hooks?.didResolveOperation?.({
      document,
      operation,
      request: { query: 'query Viewer { readUserById(userId: "user-1") { userId username } }', variables: {} },
      operationName: 'Viewer',
    } as any);

    expect(emitGraphqlQueryGuardMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'Viewer',
        operationType: 'query',
        accepted: true,
      }),
    );
  });

  it('emits rejected metrics before throwing when the query exceeds guard limits', async () => {
    const aliasedFields = Array.from({ length: 900 }, (_, index) => `field${index}: username`).join('\n');
    const query = `
      query SyntheticQueryGuardComplexityProbe {
        readUserByUsername(username: "seeded-user") {
          ${aliasedFields}
        }
      }
    `;
    const { document, operation } = getOperation(query);
    const plugin = createGraphqlQueryGuardMetricsPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        document,
        operation,
        request: { query, variables: {} },
        operationName: 'SyntheticQueryGuardComplexityProbe',
      } as any),
    ).rejects.toThrow('maximum allowed complexity');

    expect(emitGraphqlQueryGuardMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'SyntheticQueryGuardComplexityProbe',
        operationType: 'query',
        accepted: false,
      }),
    );
  });

  it('skips metric emission for introspection operations', async () => {
    const query = 'query IntrospectionQuery { __schema { queryType { name } } }';
    const { document, operation } = getOperation(query);
    const plugin = createGraphqlQueryGuardMetricsPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await hooks?.didResolveOperation?.({
      document,
      operation,
      request: { query, operationName: 'IntrospectionQuery', variables: {} },
      operationName: 'IntrospectionQuery',
    } as any);

    expect(emitGraphqlQueryGuardMetrics).not.toHaveBeenCalled();
  });
});
