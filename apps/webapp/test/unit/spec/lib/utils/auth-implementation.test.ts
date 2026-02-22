describe('auth utils implementation', () => {
  const setup = () => {
    jest.resetModules();

    const decodeJwt = jest.fn();
    jest.doMock('jose', () => ({ decodeJwt }));

    let auth: typeof import('@/lib/utils/auth');
    jest.isolateModules(() => {
      auth = require('@/lib/utils/auth');
    });

    return { auth: auth!, decodeJwt };
  };

  it('returns false when token is missing', async () => {
    const { auth } = setup();
    await expect(auth.isAuthenticated(undefined)).resolves.toBe(false);
  });

  it('returns true for unexpired tokens', async () => {
    const { auth, decodeJwt } = setup();

    decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

    await expect(auth.isAuthenticated('token')).resolves.toBe(true);
    expect(decodeJwt).toHaveBeenCalledWith('token');
  });

  it('returns false for expired tokens', async () => {
    const { auth, decodeJwt } = setup();

    decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 60 });

    await expect(auth.isAuthenticated('expired-token')).resolves.toBe(false);
  });

  it('returns false when exp is missing', async () => {
    const { auth, decodeJwt } = setup();

    decodeJwt.mockReturnValue({ sub: 'user-1' });

    await expect(auth.isAuthenticated('token-without-exp')).resolves.toBe(false);
  });

  it('returns false when decodeJwt throws', async () => {
    const { auth, decodeJwt } = setup();

    decodeJwt.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(auth.isAuthenticated('bad-token')).resolves.toBe(false);
  });

  it('builds auth headers for a token', () => {
    const { auth } = setup();

    expect(auth.getAuthHeader(null)).toEqual({});
    expect(auth.getAuthHeader('token')).toEqual({ Authorization: 'Bearer token' });
  });
});
