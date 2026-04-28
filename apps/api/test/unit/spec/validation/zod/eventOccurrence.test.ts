import { UpdateEventOccurrenceInputSchema } from '@/validation/zod';

describe('EventOccurrence validation', () => {
  describe('UpdateEventOccurrenceInputSchema', () => {
    it('treats null startAt as omitted instead of coercing it to the epoch', () => {
      const result = UpdateEventOccurrenceInputSchema.safeParse({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        startAt: null,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error.issues[0]?.message).toBe('At least one occurrence field must be provided for update.');
    });

    it('allows null endAt so callers can intentionally clear the occurrence end time', () => {
      const result = UpdateEventOccurrenceInputSchema.parse({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        endAt: null,
      });

      expect(result.endAt).toBeNull();
    });
  });
});
