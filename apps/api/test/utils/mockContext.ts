import DataLoader from 'dataloader';
import { EventParticipantDAO } from '@/mongodb/dao';
import type { User, EventCategory, Event, Organization } from '@gatherle/commons/types';
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
    events?: Map<string, Event>;
    organizations?: Map<string, Organization>;
  },
): ServerContext => {
  const userLoader = new DataLoader<string, User | null>(async (keys) => {
    return keys.map((key) => mockData?.users?.get(key) ?? null);
  });

  const categoryLoader = new DataLoader<string, EventCategory | null>(async (keys) => {
    return keys.map((key) => mockData?.categories?.get(key) ?? null);
  });

  const eventLoader = new DataLoader<string, Event | null>(async (keys) => {
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

  const eventParticipantLoader = new DataLoader<string, any>(async (keys) => {
    return keys.map(() => null);
  });

  const eventParticipantsByEventLoader = new DataLoader<string, any[]>(async (eventIds) => {
    const allParticipants = await EventParticipantDAO.readByEvents([...eventIds]);
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
      event: eventLoader,
      organization: organizationLoader,
      eventParticipant: eventParticipantLoader,
      eventParticipantsByEvent: eventParticipantsByEventLoader,
    },
    ...overrides,
  };
};
