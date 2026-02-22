import {
  CIRCULAR_REFERENCE_VALUE,
  DEFAULT_MAX_LOG_STRING_LENGTH,
  REDACTED_LOG_VALUE,
  redactSensitiveData,
} from '@/utils/logRedaction';

describe('redactSensitiveData', () => {
  it('redacts sensitive keys recursively for nested objects and arrays', () => {
    const input = {
      email: 'user@example.com',
      password: 'super-secret-password',
      profile: {
        bio: 'hello world',
        accessToken: 'access-token-value',
      },
      devices: [{ refreshToken: 'refresh-token-value' }, { label: 'phone' }],
    };

    const redacted = redactSensitiveData(input) as {
      email: string;
      password: string;
      profile: { bio: string; accessToken: string };
      devices: Array<{ refreshToken?: string; label?: string }>;
    };

    expect(redacted.email).toBe(REDACTED_LOG_VALUE);
    expect(redacted.password).toBe(REDACTED_LOG_VALUE);
    expect(redacted.profile.accessToken).toBe(REDACTED_LOG_VALUE);
    expect(redacted.profile.bio).toBe('hello world');
    expect(redacted.devices[0].refreshToken).toBe(REDACTED_LOG_VALUE);
    expect(redacted.devices[1].label).toBe('phone');
  });

  it('truncates long strings to avoid oversized log payloads', () => {
    const longValue = 'x'.repeat(DEFAULT_MAX_LOG_STRING_LENGTH + 40);
    const redacted = redactSensitiveData({ message: longValue }) as { message: string };

    expect(redacted.message.length).toBeGreaterThan(DEFAULT_MAX_LOG_STRING_LENGTH);
    expect(redacted.message).toContain('[truncated 40 chars]');
    expect(redacted.message.startsWith('x'.repeat(DEFAULT_MAX_LOG_STRING_LENGTH))).toBe(true);
  });

  it('handles circular references safely', () => {
    const circular: Record<string, unknown> = { id: 'abc' };
    circular.self = circular;

    const redacted = redactSensitiveData(circular) as { id: string; self: string };

    expect(redacted.id).toBe('abc');
    expect(redacted.self).toBe(CIRCULAR_REFERENCE_VALUE);
  });
});
