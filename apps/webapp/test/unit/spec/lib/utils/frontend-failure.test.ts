import { classifyFrontendFailure } from '@/lib/utils/frontend-failure';

describe('web frontend failure utilities', () => {
  it('classifies unauthenticated GraphQL responses as session expiry', () => {
    expect(
      classifyFrontendFailure({
        graphQLErrors: [{ extensions: { code: 'UNAUTHENTICATED' }, message: 'Please log in again' }],
      }),
    ).toBe('session-expired');
  });

  it('classifies fetch transport issues as offline failures', () => {
    expect(
      classifyFrontendFailure({
        networkError: { message: 'Failed to fetch' },
      }),
    ).toBe('offline');
  });

  it('classifies 401 and 403 transport auth failures as session expiry', () => {
    expect(
      classifyFrontendFailure({
        networkError: { message: 'Unauthorized', statusCode: 401 },
      }),
    ).toBe('session-expired');

    expect(
      classifyFrontendFailure({
        networkError: { message: 'Forbidden', statusCode: 403 },
      }),
    ).toBe('session-expired');
  });

  it('classifies 5xx responses as backend failures', () => {
    expect(
      classifyFrontendFailure({
        networkError: { message: 'Service unavailable', statusCode: 503 },
      }),
    ).toBe('backend');
  });

  it('falls back to unexpected for unknown failures', () => {
    expect(classifyFrontendFailure({ graphQLErrors: [{ message: 'Oops' }] })).toBe('unexpected');
  });
});
