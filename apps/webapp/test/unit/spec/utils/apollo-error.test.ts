import { extractApolloErrorMessage, isApolloAuthError } from '@/lib/utils/apollo-error';

describe('apollo-error utilities', () => {
  it('extracts GraphQL error messages first', () => {
    const message = extractApolloErrorMessage({ graphQLErrors: [{ message: 'GraphQL failure' }] }, 'default');
    expect(message).toBe('GraphQL failure');
  });

  it('falls back to network error result', () => {
    const message = extractApolloErrorMessage(
      { networkError: { result: { errors: [{ message: 'Network failure' }] } } },
      'default',
    );
    expect(message).toBe('Network failure');
  });

  it('uses the provided general message when available', () => {
    const message = extractApolloErrorMessage({ message: 'General failure' }, 'default');
    expect(message).toBe('General failure');
  });

  it('returns default message when no specific data is present', () => {
    const message = extractApolloErrorMessage(undefined, 'default message');
    expect(message).toBe('default message');
  });

  it('detects authentication errors via extensions', () => {
    expect(
      isApolloAuthError({
        graphQLErrors: [{ message: 'oops', extensions: { code: 'UNAUTHENTICATED' } }],
      }),
    ).toBe(true);
  });

  it('detects authentication errors via message content', () => {
    expect(
      isApolloAuthError({
        graphQLErrors: [{ message: 'You must be logged in to continue' }],
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isApolloAuthError({ graphQLErrors: [{ message: 'Something else' }] })).toBe(false);
  });
});
