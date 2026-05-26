import { buildScheduleRuleString, isEventUpcoming, normalizeRecurrenceRule } from '@/lib/utils/rrule';

const warnMock = jest.fn();

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => warnMock(...args),
  },
}));

describe('rrule utils', () => {
  beforeEach(() => {
    warnMock.mockReset();
  });

  describe('normalizeRecurrenceRule', () => {
    it('extracts the RRULE line from a multiline payload', () => {
      expect(
        normalizeRecurrenceRule('DTSTART:20260525T100000Z\nRRULE:FREQ=WEEKLY;COUNT=3\nEXDATE:20260526T100000Z'),
      ).toBe('FREQ=WEEKLY;COUNT=3');
    });

    it('removes a leading RRULE prefix from a single-line rule', () => {
      expect(normalizeRecurrenceRule('RRULE:FREQ=DAILY;COUNT=2')).toBe('FREQ=DAILY;COUNT=2');
    });
  });

  describe('buildScheduleRuleString', () => {
    it('builds a DTSTART + RRULE string from string anchors', () => {
      expect(buildScheduleRuleString('2026-05-25T10:00:00.000Z', 'RRULE:FREQ=DAILY;COUNT=2')).toBe(
        'DTSTART:20260525T100000Z\nRRULE:FREQ=DAILY;COUNT=2',
      );
    });

    it('accepts Date anchors', () => {
      expect(buildScheduleRuleString(new Date('2026-05-25T10:00:00.000Z'), 'FREQ=WEEKLY;COUNT=1')).toBe(
        'DTSTART:20260525T100000Z\nRRULE:FREQ=WEEKLY;COUNT=1',
      );
    });
  });

  describe('isEventUpcoming', () => {
    it('defaults to true when anchorStartAt is missing', () => {
      expect(isEventUpcoming(undefined, undefined)).toBe(true);
    });

    it('treats direct RRULE strings without DTSTART as incomplete schedule data', () => {
      expect(isEventUpcoming('FREQ=DAILY;COUNT=1', undefined)).toBe(true);
      expect(warnMock).toHaveBeenCalled();
    });

    it('parses embedded DTSTART + RRULE strings', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');

      expect(isEventUpcoming(`DTSTART:${futureDate}\nRRULE:FREQ=DAILY;COUNT=1`, undefined)).toBe(true);
    });

    it('returns true and logs a warning when an embedded rule cannot be parsed', () => {
      expect(isEventUpcoming('not-a-valid-rule', undefined)).toBe(true);
      expect(warnMock).toHaveBeenCalled();
    });

    it('returns false for a valid past recurrence rule', () => {
      expect(isEventUpcoming('2020-01-01T10:00:00.000Z', 'FREQ=DAILY;COUNT=1')).toBe(false);
    });

    it('returns true and logs a warning when a standalone recurrence rule cannot be parsed', () => {
      expect(isEventUpcoming('2026-05-25T10:00:00.000Z', 'NOT=A-RULE')).toBe(true);
      expect(warnMock).toHaveBeenCalled();
    });
  });
});
