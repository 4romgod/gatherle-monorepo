import DataLoader from 'dataloader';
import EventOccurrenceService from '@/services/eventOccurrence';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import type { EventOccurrence } from '@gatherle/commons/server/types';

export const createEventOccurrenceLoader = () =>
  new DataLoader<string, EventOccurrence | null>(async (occurrenceIds) => {
    const occurrences = await EventOccurrenceDAO.readByOccurrenceIds([...occurrenceIds]);
    const occurrenceMap = new Map<string, EventOccurrence>(
      occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
    );

    return occurrenceIds.map((occurrenceId) => occurrenceMap.get(occurrenceId) ?? null);
  });

export const createEventOccurrenceByEventSeriesLoader = () =>
  new DataLoader<string, EventOccurrence | null>(async (eventSeriesIds) => {
    const representativeOccurrences = await EventOccurrenceService.readRepresentativeOccurrencesForSeriesIds([
      ...eventSeriesIds,
    ]);
    return eventSeriesIds.map((eventSeriesId) => representativeOccurrences.get(eventSeriesId) ?? null);
  });
