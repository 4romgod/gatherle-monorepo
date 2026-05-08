const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const addMilliseconds = (date: Date, milliseconds: number): Date => new Date(date.getTime() + milliseconds);

const addDays = (date: Date, days: number): Date => addMilliseconds(date, days * DAY_MS);

const addHours = (date: Date, hours: number): Date => addMilliseconds(date, hours * HOUR_MS);

const addMinutes = (date: Date, minutes: number): Date => addMilliseconds(date, minutes * MINUTE_MS);

const startOfUtcDay = (date: Date): Date => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};

const endOfUtcDay = (date: Date): Date => {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
};

const toRRuleDateTime = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

const nextUtcWednesdayAt = (hour: number, minute: number = 0): Date => {
  const now = new Date();
  const value = startOfUtcDay(now);
  const daysUntilWednesday = (3 - value.getUTCDay() + 7) % 7;

  value.setUTCDate(value.getUTCDate() + daysUntilWednesday);
  value.setUTCHours(hour, minute, 0, 0);

  if (value.getTime() <= now.getTime() + DAY_MS) {
    value.setUTCDate(value.getUTCDate() + 7);
  }

  return value;
};

export type WeeklyOccurrenceFixture = {
  firstStartAt: Date;
  firstEndAt: Date;
  secondStartAt: Date;
  secondEndAt: Date;
  thirdStartAt: Date;
  thirdEndAt: Date;
  singleStartAt: Date;
  singleEndAt: Date;
  rangeStartAt: Date;
  rangeEndAt: Date;
  updatedFirstStartAt: Date;
  updatedFirstEndAt: Date;
  weeklyRuleCount2: string;
  weeklyRuleCount3: string;
  singleRuleCount1: string;
};

export const buildWeeklyOccurrenceFixture = (): WeeklyOccurrenceFixture => {
  const firstStartAt = nextUtcWednesdayAt(16);
  const firstEndAt = addHours(firstStartAt, 3);
  const secondStartAt = addDays(firstStartAt, 7);
  const secondEndAt = addHours(secondStartAt, 3);
  const thirdStartAt = addDays(firstStartAt, 14);
  const thirdEndAt = addHours(thirdStartAt, 3);

  const singleStartAt = addDays(startOfUtcDay(firstStartAt), 1);
  singleStartAt.setUTCHours(10, 0, 0, 0);
  const singleEndAt = addHours(singleStartAt, 2);

  return {
    firstStartAt,
    firstEndAt,
    secondStartAt,
    secondEndAt,
    thirdStartAt,
    thirdEndAt,
    singleStartAt,
    singleEndAt,
    rangeStartAt: startOfUtcDay(addDays(firstStartAt, -1)),
    rangeEndAt: endOfUtcDay(addDays(thirdStartAt, 1)),
    updatedFirstStartAt: addMinutes(firstStartAt, 90),
    updatedFirstEndAt: addMinutes(firstEndAt, 90),
    weeklyRuleCount2: `DTSTART:${toRRuleDateTime(firstStartAt)}\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE`,
    weeklyRuleCount3: `DTSTART:${toRRuleDateTime(firstStartAt)}\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE`,
    singleRuleCount1: `DTSTART:${toRRuleDateTime(singleStartAt)}\nRRULE:FREQ=DAILY;COUNT=1`,
  };
};

export const buildOccurrenceId = (eventId: string, startAt: Date): string => `${eventId}#${startAt.toISOString()}`;
