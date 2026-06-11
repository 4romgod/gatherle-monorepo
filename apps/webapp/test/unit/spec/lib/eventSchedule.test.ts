import { resolveEventScheduleTimezone } from '@/lib/utils/eventSchedule';

describe('resolveEventScheduleTimezone', () => {
  it('preserves the existing schedule timezone when present', () => {
    expect(resolveEventScheduleTimezone({ timezone: 'America/New_York' })).toBe('America/New_York');
  });

  it('falls back to the viewer timezone when the schedule is missing one', () => {
    const resolvedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    expect(resolveEventScheduleTimezone({ timezone: '   ' })).toBe(resolvedTimezone);
    expect(resolveEventScheduleTimezone(null)).toBe(resolvedTimezone);
  });
});
