const DEFAULT_DISCOVERY_OCCURRENCE_WINDOW_MONTHS = 12;
// Exact event selection should be able to reveal a series across its realistic
// history and future, instead of disappearing outside the discovery feed window.
const SELECTED_EVENT_OCCURRENCE_LOOKBACK_YEARS = 10;
const SELECTED_EVENT_OCCURRENCE_LOOKAHEAD_YEARS = 10;

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

export function buildSelectedEventOccurrenceDateRange(fromDate: Date = new Date()) {
  const startDate = new Date(fromDate);
  startDate.setFullYear(startDate.getFullYear() - SELECTED_EVENT_OCCURRENCE_LOOKBACK_YEARS);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(fromDate);
  endDate.setFullYear(endDate.getFullYear() + SELECTED_EVENT_OCCURRENCE_LOOKAHEAD_YEARS);
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
