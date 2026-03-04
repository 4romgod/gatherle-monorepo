import type { ApolloError } from '@apollo/client';
import { getApolloErrorCode, getApolloErrorMessage } from '@/data/actions/types';

/** Build a minimal ApolloError-shaped object for testing */
const makeError = (overrides: Partial<ApolloError> = {}): ApolloError =>
  ({
    message: '',
    graphQLErrors: [],
    networkError: null,
    ...overrides,
  }) as unknown as ApolloError;

describe('getApolloErrorMessage', () => {
  it('returns the message from the first graphQLError', () => {
    const error = makeError({
      graphQLErrors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } } as any],
    });
    expect(getApolloErrorMessage(error)).toBe('Unauthorized');
  });

  it('returns the message from networkError.result.errors when graphQLErrors is empty', () => {
    const error = makeError({
      graphQLErrors: [],
      networkError: {
        result: { errors: [{ message: 'Server rejected', extensions: { code: 'CONFLICT' } }] },
      } as any,
    });
    expect(getApolloErrorMessage(error)).toBe('Server rejected');
  });

  it('prefers graphQLErrors over networkError.result.errors', () => {
    const error = makeError({
      graphQLErrors: [{ message: 'GraphQL message' } as any],
      networkError: {
        result: { errors: [{ message: 'Network message' }] },
      } as any,
    });
    expect(getApolloErrorMessage(error)).toBe('GraphQL message');
  });

  it('falls back to error.message when no graphQL or network errors', () => {
    const error = makeError({ message: 'Generic connection error' });
    expect(getApolloErrorMessage(error)).toBe('Generic connection error');
  });

  it('returns null when error.message is empty and there are no errors', () => {
    const error = makeError({ message: '' });
    expect(getApolloErrorMessage(error)).toBeNull();
  });

  it('returns null when networkError has no result', () => {
    const error = makeError({ networkError: { message: 'timeout' } as any });
    expect(getApolloErrorMessage(error)).toBeNull();
  });
});

describe('getApolloErrorCode', () => {
  it('returns the extension code from the first graphQLError', () => {
    const error = makeError({
      graphQLErrors: [{ message: 'Conflict', extensions: { code: 'CONFLICT' } } as any],
    });
    expect(getApolloErrorCode(error)).toBe('CONFLICT');
  });

  it('returns the extension code from networkError.result.errors when graphQLErrors is empty', () => {
    const error = makeError({
      graphQLErrors: [],
      networkError: {
        result: { errors: [{ message: 'Conflict', extensions: { code: 'CONFLICT' } }] },
      } as any,
    });
    expect(getApolloErrorCode(error)).toBe('CONFLICT');
  });

  it('returns null when the error has no extensions code', () => {
    const error = makeError({
      graphQLErrors: [{ message: 'Some error' } as any],
    });
    expect(getApolloErrorCode(error)).toBeNull();
  });

  it('returns null when there are no errors at all', () => {
    const error = makeError({ message: 'Generic error' });
    expect(getApolloErrorCode(error)).toBeNull();
  });

  it('returns BAD_USER_INPUT code correctly', () => {
    const error = makeError({
      graphQLErrors: [{ message: 'Invalid input', extensions: { code: 'BAD_USER_INPUT' } } as any],
    });
    expect(getApolloErrorCode(error)).toBe('BAD_USER_INPUT');
  });

  it('returns NOT_FOUND code from networkError.result.errors', () => {
    const error = makeError({
      networkError: {
        result: { errors: [{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }] },
      } as any,
    });
    expect(getApolloErrorCode(error)).toBe('NOT_FOUND');
  });
});
