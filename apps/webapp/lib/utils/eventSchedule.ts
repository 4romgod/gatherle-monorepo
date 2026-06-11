type ScheduleLike = {
  timezone?: string | null;
};

export function resolveEventScheduleTimezone(schedule?: ScheduleLike | null) {
  const normalizedTimezone = schedule?.timezone?.trim();

  if (normalizedTimezone) {
    return normalizedTimezone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
