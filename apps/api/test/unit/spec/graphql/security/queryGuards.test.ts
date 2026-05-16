import { parse, type OperationDefinitionNode } from 'graphql';
import { enforceQueryGuards } from '@/graphql/security';

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

describe('enforceQueryGuards', () => {
  it('allows a shallow query within the configured limits', () => {
    const { document, operation } = getOperation(`
      query GetViewer {
        __typename
        readUserById(userId: "user-1") {
          userId
          username
        }
      }
    `);

    expect(() =>
      enforceQueryGuards(document, operation, {}, { maxDepth: 5, maxComplexity: 50, allowIntrospection: true }),
    ).not.toThrow();
  });

  it('rejects queries that exceed the configured maximum depth', () => {
    const { document, operation } = getOperation(`
      query TooDeep {
        readUsers(options: { pagination: { limit: 1 } }) {
          location {
            coordinates {
              latitude
            }
          }
        }
      }
    `);

    expect(() =>
      enforceQueryGuards(document, operation, {}, { maxDepth: 2, maxComplexity: 500, allowIntrospection: true }),
    ).toThrow('Query depth 4 exceeds the maximum allowed depth of 2.');
  });

  it('rejects queries that exceed the configured maximum complexity', () => {
    const { document, operation } = getOperation(`
      query TooExpensive {
        readUsers(options: { pagination: { limit: 50 } }) {
          userId
          username
          bio
        }
      }
    `);

    expect(() =>
      enforceQueryGuards(document, operation, {}, { maxDepth: 10, maxComplexity: 20, allowIntrospection: true }),
    ).toThrow('Query complexity 56 exceeds the maximum allowed complexity of 20.');
  });

  it('uses nested pagination limits from variables when calculating complexity', () => {
    const { document, operation } = getOperation(`
      query TooExpensiveFromVariables($options: QueryOptionsInput!) {
        readUsers(options: $options) {
          userId
          username
          bio
        }
      }
    `);

    expect(() =>
      enforceQueryGuards(
        document,
        operation,
        {
          options: {
            pagination: {
              limit: '50',
            },
          },
        },
        { maxDepth: 10, maxComplexity: 20, allowIntrospection: true },
      ),
    ).toThrow('Query complexity 56 exceeds the maximum allowed complexity of 20.');
  });

  it('does not recurse forever when fragments reference each other cyclically', () => {
    const { document, operation } = getOperation(`
      query CyclicFragments {
        readUsers(options: { pagination: { limit: 1 } }) {
          ...UserFields
        }
      }

      fragment UserFields on User {
        username
        ...UserLoop
      }

      fragment UserLoop on User {
        bio
        ...UserFields
      }
    `);

    expect(() =>
      enforceQueryGuards(document, operation, {}, { maxDepth: 6, maxComplexity: 20, allowIntrospection: true }),
    ).not.toThrow();
  });

  it('rejects introspection when the stage disallows it', () => {
    const { document, operation } = getOperation(`
      query IntrospectionQuery {
        __schema {
          queryType {
            name
          }
        }
      }
    `);

    expect(() =>
      enforceQueryGuards(document, operation, {}, { maxDepth: 10, maxComplexity: 100, allowIntrospection: false }),
    ).toThrow('Schema introspection is disabled for this stage.');
  });
});
