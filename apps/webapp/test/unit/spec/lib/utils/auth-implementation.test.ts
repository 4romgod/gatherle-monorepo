describe('auth utils implementation', () => {
  const setEnvVar = (key: string, value?: string) => {
    if (typeof value === 'undefined') {
      delete process.env[key];
      return;
    }

    Object.defineProperty(process.env, key, {
      configurable: true,
      value,
    });
  };

  const setup = (jwtSecret: string) => {
    jest.resetModules();
    setEnvVar('JWT_SECRET', jwtSecret);

    if (typeof global.TextEncoder === 'undefined') {
      const { TextEncoder } = require('util');
      global.TextEncoder = TextEncoder;
    }

    const jwtVerify = jest.fn();
    jest.doMock('jose', () => ({ jwtVerify }));
    jest.doMock('@/lib/constants/environment-variables', () => ({
      JWT_SECRET: jwtSecret,
      GRAPHQL_URL: '',
    }));

    let auth: typeof import('@/lib/utils/auth');
    jest.isolateModules(() => {
      auth = require('@/lib/utils/auth');
    });

    return { auth: auth!, jwtVerify };
  };

  it('returns false/null when token or secret is missing', async () => {
    const { auth } = setup('');

    await expect(auth.isAuthenticated('token')).resolves.toBe(false);
    await expect(auth.isAuthenticated(undefined)).resolves.toBe(false);
    await expect(auth.verifyAndDecodeToken('token')).resolves.toBeNull();
    await expect(auth.verifyAndDecodeToken(undefined)).resolves.toBeNull();
  });

  it('returns true and decoded payload when jwtVerify succeeds', async () => {
    const payload = { userId: 'user-1', email: 'test@example.com' };
    const { auth, jwtVerify } = setup('secret');

    jwtVerify.mockResolvedValue({ payload });

    await expect(auth.isAuthenticated('token')).resolves.toBe(true);
    await expect(auth.verifyAndDecodeToken('token')).resolves.toEqual(payload);

    expect(jwtVerify).toHaveBeenCalled();
  });

  it('returns false/null when jwtVerify throws', async () => {
    const { auth, jwtVerify } = setup('secret');

    jwtVerify.mockRejectedValue(new Error('invalid'));

    await expect(auth.isAuthenticated('bad-token')).resolves.toBe(false);
    await expect(auth.verifyAndDecodeToken('bad-token')).resolves.toBeNull();
  });

  it('builds auth headers for a token', () => {
    const { auth } = setup('secret');

    expect(auth.getAuthHeader(null)).toEqual({});
    expect(auth.getAuthHeader('token')).toEqual({ Authorization: 'Bearer token' });
  });
});
