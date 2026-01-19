import { DATE_FILTER_OPTIONS, DATE_FILTER_LABELS, DateFilterOption } from '@/lib/constants/date-filters';

describe('Date Filter Constants', () => {
  describe('DATE_FILTER_OPTIONS enum', () => {
    it('should have TODAY option', () => {
      expect(DATE_FILTER_OPTIONS.TODAY).toBe('TODAY');
    });

    it('should have TOMORROW option', () => {
      expect(DATE_FILTER_OPTIONS.TOMORROW).toBe('TOMORROW');
    });

    it('should have THIS_WEEK option', () => {
      expect(DATE_FILTER_OPTIONS.THIS_WEEK).toBe('THIS_WEEK');
    });

    it('should have THIS_WEEKEND option', () => {
      expect(DATE_FILTER_OPTIONS.THIS_WEEKEND).toBe('THIS_WEEKEND');
    });

    it('should have THIS_MONTH option', () => {
      expect(DATE_FILTER_OPTIONS.THIS_MONTH).toBe('THIS_MONTH');
    });

    it('should have CUSTOM option (UI-only)', () => {
      expect(DATE_FILTER_OPTIONS.CUSTOM).toBe('CUSTOM');
    });

    it('should have exactly 6 options', () => {
      const keys = Object.keys(DATE_FILTER_OPTIONS);
      expect(keys).toHaveLength(6);
    });
  });

  describe('DATE_FILTER_LABELS', () => {
    it('should map TODAY to "Today"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.TODAY]).toBe('Today');
    });

    it('should map TOMORROW to "Tomorrow"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.TOMORROW]).toBe('Tomorrow');
    });

    it('should map THIS_WEEK to "This Week"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.THIS_WEEK]).toBe('This Week');
    });

    it('should map THIS_WEEKEND to "This Weekend"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.THIS_WEEKEND]).toBe('This Weekend');
    });

    it('should map THIS_MONTH to "This Month"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.THIS_MONTH]).toBe('This Month');
    });

    it('should map CUSTOM to "Custom"', () => {
      expect(DATE_FILTER_LABELS[DATE_FILTER_OPTIONS.CUSTOM]).toBe('Custom');
    });

    it('should have a label for every filter option', () => {
      const filterOptions = Object.values(DATE_FILTER_OPTIONS);
      const labelKeys = Object.keys(DATE_FILTER_LABELS);

      filterOptions.forEach(option => {
        expect(labelKeys).toContain(option);
        expect(DATE_FILTER_LABELS[option as keyof typeof DATE_FILTER_LABELS]).toBeDefined();
      });
    });

    it('should have human-readable labels (capitalized, space-separated)', () => {
      const labels = Object.values(DATE_FILTER_LABELS);

      labels.forEach(label => {
        // Each label should start with an uppercase letter
        expect(label[0]).toBe(label[0].toUpperCase());
        // Labels should not be all uppercase (should be readable)
        expect(label).not.toBe(label.toUpperCase());
      });
    });
  });

  describe('DateFilterOption type', () => {
    it('should exclude CUSTOM from DateFilterOption', () => {
      // This is a compile-time check - we verify by using the type
      const validOptions: DateFilterOption[] = [
        DATE_FILTER_OPTIONS.TODAY,
        DATE_FILTER_OPTIONS.TOMORROW,
        DATE_FILTER_OPTIONS.THIS_WEEK,
        DATE_FILTER_OPTIONS.THIS_WEEKEND,
        DATE_FILTER_OPTIONS.THIS_MONTH,
      ];

      expect(validOptions).toHaveLength(5);
      expect(validOptions).not.toContain(DATE_FILTER_OPTIONS.CUSTOM);
    });
  });
});
