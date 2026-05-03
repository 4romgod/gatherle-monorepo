const DEFAULT_DISCOVERY_OCCURRENCE_WINDOW_MONTHS = 6;

export function buildDefaultOccurrenceDateRange(fromDate: Date = new Date()) {
  const startDate = new Date(fromDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + DEFAULT_DISCOVERY_OCCURRENCE_WINDOW_MONTHS);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function dedupeOccurrencesBySeries<T extends { eventSeriesId: string }>(occurrences: T[], limit?: number): T[] {
  const uniqueOccurrences: T[] = [];
  const seenSeriesIds = new Set<string>();

  for (const occurrence of occurrences) {
    if (seenSeriesIds.has(occurrence.eventSeriesId)) {
      continue;
    }

    seenSeriesIds.add(occurrence.eventSeriesId);
    uniqueOccurrences.push(occurrence);

    if (limit !== undefined && uniqueOccurrences.length >= limit) {
      break;
    }
  }

  return uniqueOccurrences;
}
