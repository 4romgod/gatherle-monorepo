import { parseBody, response } from '@/websocket/response';

describe('response', () => {
  it('returns statusCode and serialized body', () => {
    const result = response(200, { message: 'ok' });
    expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ message: 'ok' }) });
  });

  it('includes headers when provided', () => {
    const result = response(200, { message: 'Connected' }, { 'Sec-WebSocket-Protocol': 'gatherle.jwt.token' });
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected' }),
      headers: { 'Sec-WebSocket-Protocol': 'gatherle.jwt.token' },
    });
  });

  it('omits headers key entirely when headers are not provided', () => {
    const result = response(200, { message: 'ok' }) as Record<string, unknown>;
    expect(Object.keys(result)).not.toContain('headers');
  });

  it('omits headers key entirely when headers are undefined', () => {
    const result = response(200, { message: 'ok' }, undefined) as Record<string, unknown>;
    expect(Object.keys(result)).not.toContain('headers');
  });

  it('supports multiple headers', () => {
    const result = response(200, {}, { 'X-Foo': 'bar', 'X-Baz': 'qux' });
    expect(result).toMatchObject({ headers: { 'X-Foo': 'bar', 'X-Baz': 'qux' } });
  });

  it('serializes a complex body', () => {
    const body = { id: '123', nested: { count: 5 } };
    const result = response(201, body) as { body: string };
    expect(JSON.parse(result.body)).toEqual(body);
  });
});

describe('parseBody', () => {
  it('parses valid JSON string', () => {
    expect(parseBody<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(parseBody('not-json')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseBody(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseBody(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBody('')).toBeNull();
  });
});
