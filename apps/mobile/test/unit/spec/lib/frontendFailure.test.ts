import { classifyFrontendFailure, extractFrontendErrorMessage } from '@/lib/errors/frontendFailure';

describe('mobile frontend failure utilities', () => {
  it('classifies expired sessions from GraphQL error codes', () => {
    expect(
      classifyFrontendFailure({
        graphQLErrors: [{ extensions: { code: 'UNAUTHENTICATED' }, message: 'Session expired' }],
      }),
    ).toBe('session-expired');
  });

  it('classifies transport failures as offline', () => {
    expect(
      classifyFrontendFailure({
        message: 'Network error',
        networkError: { message: 'Network request failed' },
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

  it('classifies upstream service failures as backend outages', () => {
    expect(
      classifyFrontendFailure({
        networkError: { message: 'Service unavailable', statusCode: 503 },
      }),
    ).toBe('backend');
  });

  it('extracts the most useful available message', () => {
    expect(
      extractFrontendErrorMessage(
        {
          networkError: {
            result: {
              errors: [{ message: 'Gateway down' }],
            },
          },
        },
        'Fallback message',
      ),
    ).toBe('Gateway down');
  });
});
