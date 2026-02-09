import { isNotFoundGraphQLError, isGraphQLErrorNotFound } from '@/lib/utils/error-utils';

describe('error utils', () => {
  it('detects not found errors from graphQLErrors', () => {
    const error = {
      graphQLErrors: [{ extensions: { code: 'NOT_FOUND' } }],
      message: 'not found',
    } as any;

    expect(isNotFoundGraphQLError(error)).toBe(true);
    expect(isGraphQLErrorNotFound(error)).toBe(true);
  });

  it('detects not found errors from networkError payload', () => {
    const error = {
      networkError: {
        result: {
          errors: [{ extensions: { code: 'NOT_FOUND' } }],
        },
      },
    } as any;

    expect(isNotFoundGraphQLError(error)).toBe(true);
    expect(isGraphQLErrorNotFound(error)).toBe(true);
  });

  it('detects not found errors from message text', () => {
    const error = { message: 'Resource Not Found' } as any;

    expect(isNotFoundGraphQLError(error)).toBe(true);
    expect(isGraphQLErrorNotFound(error)).toBe(true);
  });

  it('returns false for non-object or non-matching errors', () => {
    expect(isGraphQLErrorNotFound(null)).toBe(false);
    expect(isGraphQLErrorNotFound('error')).toBe(false);
    expect(isNotFoundGraphQLError({ message: 'Other error' } as any)).toBe(false);
  });
});
