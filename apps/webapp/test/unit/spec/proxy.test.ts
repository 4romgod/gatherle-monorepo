const mockIsAuthenticated = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({ headers: new Headers() }),
    redirect: (url: URL) => ({ headers: new Headers({ location: url.toString() }) }),
  },
}));

jest.mock('@/lib/utils', () => ({
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

const { proxy } = require('@/proxy');
const { ROUTES } = require('@/lib/constants');

describe('proxy protected-route redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(false);
  });

  it('preserves the originally requested protected path when redirecting to login', async () => {
    const response = await proxy({
      nextUrl: new URL('http://localhost:3000/admin?tab=users'),
      auth: undefined,
    });

    expect(response.headers.get('location')).toBe(
      `http://localhost:3000${ROUTES.AUTH.LOGIN}?redirectTo=%2Fadmin%3Ftab%3Dusers`,
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith('[Proxy] Redirecting to login - token invalid or expired');
  });
});
