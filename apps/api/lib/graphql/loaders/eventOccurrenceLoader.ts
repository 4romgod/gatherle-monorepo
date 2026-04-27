import DataLoader from 'dataloader';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import type { EventOccurrence } from '@gatherle/commons/types';

export const createEventOccurrenceLoader = () =>
  new DataLoader<string, EventOccurrence | null>(async (occurrenceIds) => {
    const occurrences = await EventOccurrenceDAO.readByOccurrenceIds([...occurrenceIds]);
    const occurrenceMap = new Map<string, EventOccurrence>(
      occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
    );

    return occurrenceIds.map((occurrenceId) => occurrenceMap.get(occurrenceId) ?? null);
  });
