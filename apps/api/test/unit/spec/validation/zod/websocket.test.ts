import { NotificationSubscribePayloadSchema } from '@/validation/zod/websocket';

describe('NotificationSubscribePayloadSchema', () => {
  it('trims valid topic names and preserves passthrough fields', () => {
    const parsed = NotificationSubscribePayloadSchema.parse({
      topics: [' bell ', 'news.updates'],
      client: 'ios',
    });

    expect(parsed).toEqual({
      topics: ['bell', 'news.updates'],
      client: 'ios',
    });
  });

  it('defaults topics to an empty array when omitted', () => {
    const parsed = NotificationSubscribePayloadSchema.parse({});

    expect(parsed.topics).toEqual([]);
  });

  it('rejects invalid topic names', () => {
    const result = NotificationSubscribePayloadSchema.safeParse({
      topics: ['bell', 'bad/topic'],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid topic name.');
  });

  it('rejects requests that subscribe to too many topics at once', () => {
    const result = NotificationSubscribePayloadSchema.safeParse({
      topics: Array.from({ length: 11 }, (_, index) => `topic-${index}`),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('No more than 10 topics may be subscribed in one request.');
  });
});
