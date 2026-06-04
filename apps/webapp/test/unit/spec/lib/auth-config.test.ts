const googleProviderMock = jest.fn((options) => ({ id: 'google', options }));
const appleProviderMock = jest.fn((options) => ({ id: 'apple', options }));
const credentialsProviderMock = jest.fn((options) => ({ id: options?.id ?? 'credentials', options }));

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: (...args: unknown[]) => googleProviderMock(...args),
}));

jest.mock('next-auth/providers/apple', () => ({
  __esModule: true,
  default: (...args: unknown[]) => appleProviderMock(...args),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: (...args: unknown[]) => credentialsProviderMock(...args),
}));

jest.mock('@/data/actions/global/auth/login', () => ({
  loginUserGlobalAction: jest.fn(),
}));

describe('auth.config', () => {
  beforeEach(() => {
    jest.resetModules();
    googleProviderMock.mockClear();
    appleProviderMock.mockClear();
    credentialsProviderMock.mockClear();
  });

  it('forces the Google account chooser in provider authorization params', async () => {
    await import('@/auth.config');

    expect(googleProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorization: expect.objectContaining({
          params: expect.objectContaining({
            prompt: 'select_account',
            scope: 'openid profile email',
          }),
        }),
      }),
    );
  });
});
