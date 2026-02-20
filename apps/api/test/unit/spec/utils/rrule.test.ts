import { getDateRangeForFilter, hasOccurrenceInRange, getNextOccurrence } from '@/utils/rrule';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons';

describe('RRule Utilities', () => {
  describe('hasOccurrenceInRange', () => {
    it('should return true for a single occurrence event within range', () => {
      const today = new Date();
      today.setHours(18, 0, 0, 0);
      const todayStr = today.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const rrule = `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`;

      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const result = hasOccurrenceInRange(rrule, startOfDay, endOfDay);
      expect(result).toBe(true);
    });

    it('should return false for event outside range', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0);
      const yesterdayStr = yesterday.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const rrule = `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const result = hasOccurrenceInRange(rrule, startOfToday, endOfToday);
      expect(result).toBe(false);
    });

    it('should handle recurring events', () => {
      const startDate = new Date('2025-01-01T10:00:00Z');
      const startDateStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      // Weekly event for 4 weeks
      const rrule = `DTSTART:${startDateStr}\nRRULE:FREQ=WEEKLY;COUNT=4`;

      // Check if it occurs in the second week
      const weekTwoStart = new Date('2025-01-08T00:00:00Z');
      const weekTwoEnd = new Date('2025-01-14T23:59:59Z');

      const result = hasOccurrenceInRange(rrule, weekTwoStart, weekTwoEnd);
      expect(result).toBe(true);
    });
  });

  describe('getNextOccurrence', () => {
    it('should return the next occurrence date', () => {
      const today = new Date();
      const todayStr = today.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const rrule = `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const nextOccurrence = getNextOccurrence(rrule, yesterday);
      expect(nextOccurrence).not.toBeNull();
      expect(nextOccurrence?.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
    });
  });

  describe('getDateRangeForFilter', () => {
    it('should return correct range for "today"', () => {
      const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.TODAY);

      const now = new Date();
      expect(startDate.getDate()).toBe(now.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });

    it('should return correct range for "tomorrow"', () => {
      const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.TOMORROW);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(startDate.getDate()).toBe(tomorrow.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });

    it('should return correct range for "this-week"', () => {
      const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.THIS_WEEK);

      expect(startDate.getDay()).toBe(0); // Sunday
      expect(endDate.getDay()).toBe(6); // Saturday
      expect(endDate.getHours()).toBe(23);
    });

    it('should return correct range for "this-month"', () => {
      const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.THIS_MONTH);

      const now = new Date();
      expect(startDate.getDate()).toBe(1); // First day
      expect(startDate.getMonth()).toBe(now.getMonth());
      expect(endDate.getMonth()).toBe(now.getMonth());
    });

    it('should return correct range for custom date', () => {
      const customDate = new Date('2025-06-15T12:00:00Z');
      const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.CUSTOM, customDate);

      expect(startDate.getDate()).toBe(15);
      expect(startDate.getMonth()).toBe(5); // June (0-indexed)
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });
  });
});
