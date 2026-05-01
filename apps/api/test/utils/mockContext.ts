import DataLoader from 'dataloader';
import { EventOccurrenceParticipantDAO } from '@/mongodb/dao';
import type {
  User,
  EventCategory,
  EventSeries,
  Organization,
  EventOccurrence,
  EventOccurrenceParticipant,
} from '@gatherle/commons/types';
import type { ServerContext } from '@/graphql';
import { getActiveOccurrenceRsvpCountContribution, pickRepresentativeOccurrence } from '@/utils';

/**
 * Creates a mock ServerContext with loaders for testing.
 * Loaders return null by default; override with `mockData` parameter.
 */
export const createMockContext = (
  overrides?: Partial<ServerContext>,
  mockData?: {
    users?: Map<string, User>;
    categories?: Map<string, EventCategory>;
    events?: Map<string, EventSeries>;
    occurrences?: Map<string, EventOccurrence>;
    organizations?: Map<string, Organization>;
    occurrenceParticipants?: Map<string, EventOccurrenceParticipant>;
  },
): ServerContext => {
  const userLoader = new DataLoader<string, User | null>(async (keys) => {
    return keys.map((key) => mockData?.users?.get(key) ?? null);
  });

  const categoryLoader = new DataLoader<string, EventCategory | null>(async (keys) => {
    return keys.map((key) => mockData?.categories?.get(key) ?? null);
  });

  const eventSeriesLoader = new DataLoader<string, EventSeries | null>(async (keys) => {
    return keys.map((key) => mockData?.events?.get(key) ?? null);
  });

  const eventCategoryInterestCountLoader = new DataLoader<string, number>(async (keys) => {
    return keys.map((key) => {
      const categories = mockData?.categories;
      if (!categories) return 0;
      const category = categories.get(key);
      return category?.interestedUsersCount ?? 0;
    });
  });

  const organizationLoader = new DataLoader<string, Organization | null>(async (keys) => {
    return keys.map((key) => mockData?.organizations?.get(key) ?? null);
  });

  const eventOccurrenceLoader = new DataLoader<string, EventOccurrence | null>(async (keys) => {
    return keys.map((key) => mockData?.occurrences?.get(key) ?? null);
  });

  const eventOccurrenceByEventSeriesLoader = new DataLoader<string, EventOccurrence | null>(async (eventSeriesIds) => {
    return eventSeriesIds.map((eventSeriesId) => {
      const occurrences = [...(mockData?.occurrences?.values() ?? [])].filter(
        (occurrence) => occurrence.eventSeriesId === eventSeriesId,
      );

      return pickRepresentativeOccurrence(occurrences);
    });
  });

  const eventOccurrenceParticipantLoader = new DataLoader<string, EventOccurrenceParticipant | null>(async (keys) => {
    return keys.map((key) => mockData?.occurrenceParticipants?.get(key) ?? null);
  });

  const eventOccurrenceParticipantsByOccurrenceLoader = new DataLoader<string, EventOccurrenceParticipant[]>(
    async (occurrenceIds) => {
      const allParticipants = await EventOccurrenceParticipantDAO.readByOccurrences([...occurrenceIds]);
      const map = new Map<string, EventOccurrenceParticipant[]>();
      for (const id of occurrenceIds) map.set(id, []);
      for (const participant of allParticipants) {
        if (participant && map.has(participant.occurrenceId)) {
          map.get(participant.occurrenceId)!.push(participant);
        }
      }
      return occurrenceIds.map((id) => map.get(id) ?? []);
    },
  );

  const eventOccurrenceParticipantCountByOccurrenceLoader = new DataLoader<string, number>(async (occurrenceIds) => {
    const allParticipants = await EventOccurrenceParticipantDAO.readByOccurrences([...occurrenceIds]);
    const map = new Map<string, number>();
    for (const id of occurrenceIds) map.set(id, 0);
    for (const participant of allParticipants) {
      if (participant) {
        map.set(
          participant.occurrenceId,
          (map.get(participant.occurrenceId) ?? 0) + getActiveOccurrenceRsvpCountContribution(participant),
        );
      }
    }
    return occurrenceIds.map((id) => map.get(id) ?? 0);
  });

  const myEventOccurrenceParticipantLoader = new DataLoader<string, EventOccurrenceParticipant | null>(async (keys) => {
    return keys.map((key) => mockData?.occurrenceParticipants?.get(key) ?? null);
  });

  return {
    token: undefined,
    req: undefined,
    res: undefined,
    loaders: {
      user: userLoader,
      eventCategory: categoryLoader,
      eventCategoryInterestCount: eventCategoryInterestCountLoader,
      eventSeries: eventSeriesLoader,
      eventOccurrence: eventOccurrenceLoader,
      eventOccurrenceByEventSeries: eventOccurrenceByEventSeriesLoader,
      organization: organizationLoader,
      eventOccurrenceParticipant: eventOccurrenceParticipantLoader,
      eventOccurrenceParticipantsByOccurrence: eventOccurrenceParticipantsByOccurrenceLoader,
      eventOccurrenceParticipantCountByOccurrence: eventOccurrenceParticipantCountByOccurrenceLoader,
      myEventOccurrenceParticipant: myEventOccurrenceParticipantLoader,
    },
    ...overrides,
  };
};
