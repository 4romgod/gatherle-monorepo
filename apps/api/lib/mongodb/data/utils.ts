const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

export const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
};

export const withTime = (base: Date, hours: number, minutes: number = 0) => {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
};

export const nextWeekday = (from: Date, weekday: number) => {
  const currentDay = from.getDay();
  const delta = (weekday - currentDay + 7) % 7 || 7;
  return addDays(from, delta);
};

export const buildPrimarySchedule = (
  anchorStartAt: Date,
  endAt: Date | undefined,
  recurrenceRule: string,
  timezone: string = DEFAULT_TIMEZONE,
) => {
  if (endAt && endAt.getTime() < anchorStartAt.getTime()) {
    throw new Error(`Seed schedule endAt must not be before anchorStartAt for rule "${recurrenceRule}"`);
  }

  return {
    anchorStartAt,
    occurrenceDurationMinutes: endAt ? Math.round((endAt.getTime() - anchorStartAt.getTime()) / (60 * 1000)) : 0,
    timezone,
    recurrenceRule,
  };
};
