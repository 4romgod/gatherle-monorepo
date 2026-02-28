describe('Apollo CORS helpers', () => {
  const ORIGINAL_STAGE = process.env.STAGE;
  const ORIGINAL_CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS;

  type CorsModule = typeof import('@/graphql/apollo/cors');

  const loadModule = (): CorsModule => {
    let mod: CorsModule;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('@/graphql/apollo/cors');
    });
    return mod!;
  };

  afterEach(() => {
    process.env.STAGE = ORIGINAL_STAGE;
    process.env.CORS_ALLOWED_ORIGINS = ORIGINAL_CORS_ALLOWED_ORIGINS;
  });

  it('returns the default webapp origins for the active stage', () => {
    process.env.STAGE = 'Beta';
    process.env.CORS_ALLOWED_ORIGINS = '';

    const { getAllowedCorsOrigins } = loadModule();

    expect(getAllowedCorsOrigins()).toEqual(['https://beta.gatherle.com', 'https://www.beta.gatherle.com']);
  });

  it('merges configured extra origins into the allowlist', () => {
    process.env.STAGE = 'Prod';
    process.env.CORS_ALLOWED_ORIGINS = 'https://preview.gatherle.app/path, http://localhost:3000';

    const { getAllowedCorsOrigins } = loadModule();

    expect(getAllowedCorsOrigins()).toEqual([
      'https://gatherle.com',
      'https://www.gatherle.com',
      'https://preview.gatherle.app',
      'http://localhost:3000',
    ]);
  });

  it('throws when configured origins contain a wildcard', () => {
    process.env.STAGE = 'Prod';
    process.env.CORS_ALLOWED_ORIGINS = '*';

    const { getAllowedCorsOrigins } = loadModule();

    expect(() => getAllowedCorsOrigins()).toThrow('CORS_ALLOWED_ORIGINS must use explicit origins.');
  });

  it('throws when configured origins are not valid absolute http(s) origins', () => {
    process.env.STAGE = 'Prod';
    process.env.CORS_ALLOWED_ORIGINS = 'notaurl';

    const { getAllowedCorsOrigins } = loadModule();

    expect(() => getAllowedCorsOrigins()).toThrow('Invalid CORS origin "notaurl".');
  });

  it('returns explicit CORS headers for allowed origins', () => {
    process.env.STAGE = 'Beta';
    process.env.CORS_ALLOWED_ORIGINS = '';

    const { createCorsHeaders } = loadModule();
    const headers = createCorsHeaders('https://beta.gatherle.com');

    expect(headers).toEqual({
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Origin': 'https://beta.gatherle.com',
    });
  });

  it('omits Access-Control-Allow-Origin for disallowed origins', () => {
    process.env.STAGE = 'Beta';
    process.env.CORS_ALLOWED_ORIGINS = '';

    const { createCorsHeaders } = loadModule();
    const headers = createCorsHeaders('https://evil.example');

    expect(headers).toEqual({
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
  });
});
