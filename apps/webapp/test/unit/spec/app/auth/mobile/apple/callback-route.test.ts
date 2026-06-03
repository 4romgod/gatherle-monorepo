import { GET, POST } from '@/app/auth/mobile/apple/callback/route';

class MockHeaders {
  private readonly values = new Map<string, string>();

  constructor(init: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(init)) {
      this.values.set(key.toLowerCase(), value);
    }
  }

  get(name: string) {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

class MockResponse {
  readonly headers: MockHeaders;
  readonly status: number;

  constructor(
    private readonly body: string,
    init?: {
      headers?: Record<string, string>;
      status?: number;
    },
  ) {
    this.headers = new MockHeaders(init?.headers);
    this.status = init?.status ?? 200;
  }

  async text() {
    return this.body;
  }
}

describe('Apple mobile callback route', () => {
  const originalResponse = global.Response;

  beforeAll(() => {
    (global as typeof globalThis & { Response: typeof MockResponse }).Response = MockResponse;
  });

  afterAll(() => {
    (global as typeof globalThis & { Response: typeof MockResponse | undefined }).Response = originalResponse;
  });

  it('bridges POST form data back into the mobile deep link', async () => {
    const formData = new FormData();
    formData.set('id_token', 'apple-id-token');
    formData.set('state', 'state-123');
    formData.set(
      'user',
      JSON.stringify({
        email: 'apple-user@example.com',
        name: {
          firstName: 'Apple',
          lastName: 'User',
        },
      }),
    );

    const response = await POST({
      formData: async () => formData,
    } as unknown as Request);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const body = await response.text();
    expect(body).toContain('gatherle://auth/apple');
    expect(body).toContain('id_token=apple-id-token');
    expect(body).toContain('state=state-123');
    expect(body).toContain('email=apple-user%40example.com');
    expect(body).toContain('given_name=Apple');
    expect(body).toContain('family_name=User');
  });

  it('passes through GET error parameters for browser-flow failures', async () => {
    const response = await GET({
      url: 'https://beta.gatherle.com/auth/mobile/apple/callback?error=access_denied&error_description=User%20cancelled&state=state-456',
    } as Request);

    const body = await response.text();
    expect(body).toContain('error=access_denied');
    expect(body).toContain('error_description=User+cancelled');
    expect(body).toContain('state=state-456');
  });
});
