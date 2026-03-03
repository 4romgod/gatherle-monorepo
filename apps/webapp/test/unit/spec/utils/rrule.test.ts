import { isEventUpcoming } from '@/lib/utils/rrule';

// Silence logger warnings in tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Builds an RRULE string with a fixed DTSTART so tests are date-independent.
 * All "past" rules start in 2000; all "future" rules start far in the future.
 */
const PAST_SINGLE = 'DTSTART:20000101T000000Z\nRRULE:FREQ=DAILY;COUNT=1';
const FUTURE_SINGLE = 'DTSTART:20991231T000000Z\nRRULE:FREQ=DAILY;COUNT=1';
const FUTURE_RECURRING = 'DTSTART:20991201T000000Z\nRRULE:FREQ=WEEKLY;COUNT=10';
const PAST_RECURRING = 'DTSTART:20000101T000000Z\nRRULE:FREQ=WEEKLY;COUNT=5';

describe('isEventUpcoming', () => {
  describe('null / undefined / empty inputs', () => {
    it('returns true for null (safe default — do not hide the event)', () => {
      expect(isEventUpcoming(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isEventUpcoming(undefined)).toBe(true);
    });

    it('returns true for an empty string', () => {
      expect(isEventUpcoming('')).toBe(true);
    });
  });

  describe('past events', () => {
    it('returns false for a rule whose single occurrence is in the past', () => {
      expect(isEventUpcoming(PAST_SINGLE)).toBe(false);
    });

    it('returns false for a recurring rule all of whose occurrences are in the past', () => {
      expect(isEventUpcoming(PAST_RECURRING)).toBe(false);
    });
  });

  describe('future events', () => {
    it('returns true for a rule whose single occurrence is in the future', () => {
      expect(isEventUpcoming(FUTURE_SINGLE)).toBe(true);
    });

    it('returns true for a recurring rule with future occurrences remaining', () => {
      expect(isEventUpcoming(FUTURE_RECURRING)).toBe(true);
    });
  });

  describe('invalid / malformed rules', () => {
    it('returns true (safe default) for a completely invalid string', () => {
      expect(isEventUpcoming('NOT_A_VALID_RRULE')).toBe(true);
    });

    it('returns true for a random garbage string', () => {
      expect(isEventUpcoming('!!!@@@###')).toBe(true);
    });
  });
});
