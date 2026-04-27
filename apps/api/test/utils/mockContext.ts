import DataLoader from 'dataloader';
import { EventSeriesParticipantDAO } from '@/mongodb/dao';
import type { User, EventCategory, EventSeries, Organization } from '@gatherle/commons/types';
import type { ServerContext } from '@/graphql';

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
    organizations?: Map<string, Organization>;
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

  const eventSeriesParticipantLoader = new DataLoader<string, any>(async (keys) => {
    return keys.map(() => null);
  });

  const eventParticipantsByEventLoader = new DataLoader<string, any[]>(async (eventIds) => {
    const allParticipants = await EventSeriesParticipantDAO.readByEvents([...eventIds]);
    const map = new Map<string, any[]>();
    for (const id of eventIds) map.set(id, []);
    for (const participant of allParticipants) {
      if (participant && map.has(participant.eventId)) {
        map.get(participant.eventId)!.push(participant);
      }
    }
    return eventIds.map((id) => map.get(id) ?? []);
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
      organization: organizationLoader,
      eventSeriesParticipant: eventSeriesParticipantLoader,
      eventSeriesParticipantsByEvent: eventParticipantsByEventLoader,
    },
    ...overrides,
  };
};
