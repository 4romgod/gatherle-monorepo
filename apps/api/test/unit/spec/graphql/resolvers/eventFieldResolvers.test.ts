import { EventResolver } from '@/graphql/resolvers/event';
import { FollowDAO, EventParticipantDAO } from '@/mongodb/dao';
import type { Event, EventCategory, User, EventParticipant } from '@ntlango/commons/types';
import { ParticipantStatus } from '@ntlango/commons/types';
import type { ServerContext } from '@/graphql';
import DataLoader from 'dataloader';

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    countSavesForEvent: jest.fn(),
    isEventSavedByUser: jest.fn(),
  },
  EventParticipantDAO: {
    countByEvent: jest.fn(),
    readByEventAndUser: jest.fn(),
  },
}));

describe('EventResolver Field Resolvers', () => {
  let resolver: EventResolver;
  let mockContext: ServerContext;
  let mockEventCategoryLoader: DataLoader<string, EventCategory | null>;
  let mockUserLoader: DataLoader<string, User | null>;

  beforeEach(() => {
    resolver = new EventResolver();

    // Create mock DataLoaders
    mockEventCategoryLoader = new DataLoader(async (ids) => {
      // Mock implementation
      return ids.map((id) => {
        if (id === 'cat1') return { eventCategoryId: 'cat1', name: 'Sports' } as EventCategory;
        if (id === 'cat2') return { eventCategoryId: 'cat2', name: 'Music' } as EventCategory;
        return null;
      });
    });

    mockUserLoader = new DataLoader(async (ids) => {
      return ids.map((id) => {
        if (id === 'user1') return { userId: 'user1', username: 'john' } as User;
        if (id === 'user2') return { userId: 'user2', username: 'jane' } as User;
        return null;
      });
    });

    mockContext = {
      loaders: {
        eventCategory: mockEventCategoryLoader,
        user: mockUserLoader,
      },
    } as ServerContext;
  });

  describe('eventCategories field resolver', () => {
    it('should return empty array when eventCategories is undefined', async () => {
      const event = { eventId: 'event1' } as unknown as Event;
      const result = await resolver.eventCategories(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when eventCategories is empty', async () => {
      const event = { eventId: 'event1', eventCategories: [] } as unknown as Event;
      const result = await resolver.eventCategories(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return already populated categories without calling DataLoader', async () => {
      const populatedCategories = [
        { eventCategoryId: 'cat1', name: 'Sports', slug: 'sports' } as EventCategory,
        { eventCategoryId: 'cat2', name: 'Music', slug: 'music' } as EventCategory,
      ];

      const event = {
        eventId: 'event1',
        eventCategories: populatedCategories,
      } as unknown as Event;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.eventCategories(event, mockContext);

      expect(result).toEqual(populatedCategories);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should batch load categories via DataLoader when not populated', async () => {
      const event = {
        eventId: 'event1',
        eventCategories: ['cat1', 'cat2'] as unknown as EventCategory[],
      } as unknown as Event;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.eventCategories(event, mockContext);

      expect(loadSpy).toHaveBeenCalledWith('cat1');
      expect(loadSpy).toHaveBeenCalledWith('cat2');
      expect(result).toHaveLength(2);
      expect(result[0]?.eventCategoryId).toBe('cat1');
      expect(result[1]?.eventCategoryId).toBe('cat2');
    });

    it('should filter out null results from DataLoader', async () => {
      const event = {
        eventId: 'event1',
        eventCategories: ['cat1', 'nonexistent', 'cat2'] as unknown as EventCategory[],
      } as unknown as Event;

      const result = await resolver.eventCategories(event, mockContext);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c !== null)).toBe(true);
    });
  });

  describe('organizers field resolver', () => {
    it('should return empty array when organizers is undefined', async () => {
      const event = { eventId: 'event1' } as unknown as Event;
      const result = await resolver.organizers(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when organizers is empty', async () => {
      const event = { eventId: 'event1', organizers: [] } as unknown as Event;
      const result = await resolver.organizers(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return already populated organizers without calling DataLoader', async () => {
      const populatedOrganizers = [
        {
          role: 'HOST',
          user: { userId: 'user1', username: 'john' } as User,
        },
        {
          role: 'CO_HOST',
          user: { userId: 'user2', username: 'jane' } as User,
        },
      ];

      const event = {
        eventId: 'event1',
        organizers: populatedOrganizers as unknown as Event['organizers'],
      } as unknown as Event;

      const loadSpy = jest.spyOn(mockUserLoader, 'load');

      const result = await resolver.organizers(event, mockContext);

      expect(result).toEqual(populatedOrganizers);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should batch load users via DataLoader when not populated', async () => {
      const event = {
        eventId: 'event1',
        organizers: [
          { role: 'HOST', user: 'user1' },
          { role: 'CO_HOST', user: 'user2' },
        ] as unknown as Event['organizers'],
      } as unknown as Event;

      const loadSpy = jest.spyOn(mockUserLoader, 'load');

      const result = await resolver.organizers(event, mockContext);

      expect(loadSpy).toHaveBeenCalledWith('user1');
      expect(loadSpy).toHaveBeenCalledWith('user2');
      expect(result).toHaveLength(2);
      expect((result[0].user as User).userId).toBe('user1');
      expect((result[1].user as User).userId).toBe('user2');
    });

    it('should filter out organizers with null users', async () => {
      const event = {
        eventId: 'event1',
        organizers: [
          { role: 'HOST', user: 'user1' },
          { role: 'CO_HOST', user: 'nonexistent' },
          { role: 'SPEAKER', user: 'user2' },
        ] as unknown as Event['organizers'],
      } as unknown as Event;

      const result = await resolver.organizers(event, mockContext);

      expect(result).toHaveLength(2);
      expect(result.every((o) => o.user !== null)).toBe(true);
    });
  });

  describe('savedByCount field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the count of users who saved the event', async () => {
      const event = { eventId: 'event1' } as Event;
      (FollowDAO.countSavesForEvent as jest.Mock).mockResolvedValue(42);

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).toHaveBeenCalledWith('event1');
      expect(result).toBe(42);
    });

    it('should return 0 when no users have saved the event', async () => {
      const event = { eventId: 'event1' } as Event;
      (FollowDAO.countSavesForEvent as jest.Mock).mockResolvedValue(0);

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).toHaveBeenCalledWith('event1');
      expect(result).toBe(0);
    });

    it('prefers pipeline-supplied savedByCount when available', async () => {
      const event = { eventId: 'event1', savedByCount: 13 } as Event;

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).not.toHaveBeenCalled();
      expect(result).toBe(13);
    });
  });

  describe('isSavedByMe field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when user has saved the event', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(true);

      const result = await resolver.isSavedByMe(event, contextWithUser);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toBe(true);
    });

    it('should return false when user has not saved the event', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(false);

      const result = await resolver.isSavedByMe(event, contextWithUser);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithoutUser = { ...mockContext, user: undefined };

      const result = await resolver.isSavedByMe(event, contextWithoutUser);

      expect(FollowDAO.isEventSavedByUser).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('rsvpCount field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the count of RSVPs for the event', async () => {
      const event = { eventId: 'event1' } as Event;
      (EventParticipantDAO.countByEvent as jest.Mock).mockResolvedValue(25);

      const result = await resolver.rsvpCount(event);

      expect(EventParticipantDAO.countByEvent).toHaveBeenCalledWith('event1', [
        ParticipantStatus.Going,
        ParticipantStatus.Interested,
      ]);
      expect(result).toBe(25);
    });

    it('should return 0 when no RSVPs exist', async () => {
      const event = { eventId: 'event1' } as Event;
      (EventParticipantDAO.countByEvent as jest.Mock).mockResolvedValue(0);

      const result = await resolver.rsvpCount(event);

      expect(EventParticipantDAO.countByEvent).toHaveBeenCalledWith('event1', [
        ParticipantStatus.Going,
        ParticipantStatus.Interested,
      ]);
      expect(result).toBe(0);
    });

    it('uses precomputed rsvpCount when the pipeline already provided one', async () => {
      const event = { eventId: 'event1', rsvpCount: 18 } as Event;

      const result = await resolver.rsvpCount(event);

      expect(EventParticipantDAO.countByEvent).not.toHaveBeenCalled();
      expect(result).toBe(18);
    });
  });

  describe('myRsvp field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const mockRsvp: EventParticipant = {
      participantId: 'participant1',
      eventId: 'event1',
      userId: 'user1',
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    it('should return the user RSVP when it exists', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockRsvp);

      const result = await resolver.myRsvp(event, contextWithUser);

      expect(EventParticipantDAO.readByEventAndUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toEqual(mockRsvp);
    });

    it('should return null when user has not RSVPd', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);

      const result = await resolver.myRsvp(event, contextWithUser);

      expect(EventParticipantDAO.readByEventAndUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      const event = { eventId: 'event1' } as Event;
      const contextWithoutUser = { ...mockContext, user: undefined };

      const result = await resolver.myRsvp(event, contextWithoutUser);

      expect(EventParticipantDAO.readByEventAndUser).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
