import { EventSeriesResolver } from '@/graphql/resolvers/eventSeries';
import { FollowDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import EventSeriesService from '@/services/eventSeries';
import type {
  EventSeries,
  EventCategory,
  User,
  EventOccurrence,
  EventOccurrenceParticipant,
  OrganizationMembership,
} from '@gatherle/commons/types';
import { ParticipantStatus, OrganizationRole } from '@gatherle/commons/types';
import type { ServerContext } from '@/graphql';
import DataLoader from 'dataloader';
import { buildMyEventOccurrenceParticipantLoadKey } from '@/utils';

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    countSavesForEvent: jest.fn(),
    isEventSavedByUser: jest.fn(),
  },
  OrganizationMembershipDAO: {
    readMembershipByOrgIdAndUser: jest.fn(),
  },
}));

jest.mock('@/services/eventSeries', () => ({
  __esModule: true,
  default: {
    readTrending: jest.fn(),
  },
}));

describe('EventSeriesResolver Field Resolvers', () => {
  let resolver: EventSeriesResolver;
  let mockContext: ServerContext;
  let mockEventCategoryLoader: DataLoader<string, EventCategory | null>;
  let mockUserLoader: DataLoader<string, User | null>;
  let mockOccurrenceByEventSeriesLoader: DataLoader<string, EventOccurrence | null>;
  let mockOccurrenceParticipantCountLoader: DataLoader<string, number>;
  let mockMyOccurrenceParticipantLoader: DataLoader<string, EventOccurrenceParticipant | null>;

  const singleOccurrence: EventOccurrence = {
    occurrenceId: 'event1#2026-05-07T10:00:00.000Z',
    eventSeriesId: 'event1',
    occurrenceKey: 'event1#2026-05-07T10:00:00.000Z',
    originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
    startAt: new Date('2026-05-07T10:00:00.000Z'),
    endAt: new Date('2026-05-07T12:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    resolver = new EventSeriesResolver();

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

    mockOccurrenceByEventSeriesLoader = new DataLoader(async (ids) =>
      ids.map((id) => (id === 'event1' ? singleOccurrence : null)),
    );

    mockOccurrenceParticipantCountLoader = new DataLoader(async (ids) => ids.map(() => 25));

    mockMyOccurrenceParticipantLoader = new DataLoader(async (keys) => {
      const expectedKey = buildMyEventOccurrenceParticipantLoadKey(singleOccurrence.occurrenceId, 'user1');
      return keys.map((key) =>
        key === expectedKey
          ? ({
              participantId: 'occ-participant-1',
              occurrenceId: singleOccurrence.occurrenceId,
              userId: 'user1',
              status: ParticipantStatus.Going,
              quantity: 1,
              rsvpAt: new Date(),
            } as EventOccurrenceParticipant)
          : null,
      );
    });

    mockContext = {
      loaders: {
        eventCategory: mockEventCategoryLoader,
        user: mockUserLoader,
        eventOccurrenceByEventSeries: mockOccurrenceByEventSeriesLoader,
        eventOccurrenceParticipantCountByOccurrence: mockOccurrenceParticipantCountLoader,
        myEventOccurrenceParticipant: mockMyOccurrenceParticipantLoader,
      },
    } as ServerContext;
  });

  describe('eventCategories field resolver', () => {
    it('should return empty array when eventCategories is undefined', async () => {
      const event = { eventId: 'event1' } as unknown as EventSeries;
      const result = await resolver.eventCategories(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when eventCategories is empty', async () => {
      const event = { eventId: 'event1', eventCategories: [] } as unknown as EventSeries;
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
      } as unknown as EventSeries;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.eventCategories(event, mockContext);

      expect(result).toEqual(populatedCategories);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should batch load categories via DataLoader when not populated', async () => {
      const event = {
        eventId: 'event1',
        eventCategories: ['cat1', 'cat2'] as unknown as EventCategory[],
      } as unknown as EventSeries;

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
      } as unknown as EventSeries;

      const result = await resolver.eventCategories(event, mockContext);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c !== null)).toBe(true);
    });
  });

  describe('organizers field resolver', () => {
    it('should return empty array when organizers is undefined', async () => {
      const event = { eventId: 'event1' } as unknown as EventSeries;
      const result = await resolver.organizers(event, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when organizers is empty', async () => {
      const event = { eventId: 'event1', organizers: [] } as unknown as EventSeries;
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
        organizers: populatedOrganizers as unknown as EventSeries['organizers'],
      } as unknown as EventSeries;

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
        ] as unknown as EventSeries['organizers'],
      } as unknown as EventSeries;

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
        ] as unknown as EventSeries['organizers'],
      } as unknown as EventSeries;

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
      const event = { eventId: 'event1' } as EventSeries;
      (FollowDAO.countSavesForEvent as jest.Mock).mockResolvedValue(42);

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).toHaveBeenCalledWith('event1');
      expect(result).toBe(42);
    });

    it('should return 0 when no users have saved the event', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      (FollowDAO.countSavesForEvent as jest.Mock).mockResolvedValue(0);

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).toHaveBeenCalledWith('event1');
      expect(result).toBe(0);
    });

    it('prefers pipeline-supplied savedByCount when available', async () => {
      const event = { eventId: 'event1', savedByCount: 13 } as EventSeries;

      const result = await resolver.savedByCount(event);

      expect(FollowDAO.countSavesForEvent).not.toHaveBeenCalled();
      expect(result).toBe(13);
    });
  });

  describe('representativeOccurrence field resolver', () => {
    it('returns the representative occurrence for the event series', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const loadSpy = jest.spyOn(mockOccurrenceByEventSeriesLoader, 'load');

      const result = await resolver.representativeOccurrence(event, mockContext);

      expect(loadSpy).toHaveBeenCalledWith('event1');
      expect(result).toEqual(singleOccurrence);
    });

    it('returns null when no representative occurrence exists', async () => {
      const event = { eventId: 'missing-event' } as EventSeries;

      const result = await resolver.representativeOccurrence(event, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('isSavedByMe field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when user has saved the event', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(true);

      const result = await resolver.isSavedByMe(event, contextWithUser);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toBe(true);
    });

    it('should return false when user has not saved the event', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(false);

      const result = await resolver.isSavedByMe(event, contextWithUser);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith('event1', 'user1');
      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      const event = { eventId: 'event1' } as EventSeries;
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

    it('should return the occurrence-backed RSVP count for a recurring event series', async () => {
      const event = {
        eventId: 'event1',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TH',
        },
      } as EventSeries;
      const result = await resolver.rsvpCount(event, mockContext);

      expect(result).toBe(25);
    });

    it('should return the occurrence-backed RSVP count for a single-date event series', async () => {
      const event = { eventId: 'event1' } as EventSeries;

      const result = await resolver.rsvpCount(event, mockContext);

      expect(result).toBe(25);
    });

    it('uses precomputed rsvpCount when the pipeline already provided one for a recurring series', async () => {
      const event = {
        eventId: 'event1',
        rsvpCount: 18,
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TH',
        },
      } as EventSeries;

      const result = await resolver.rsvpCount(event, mockContext);

      expect(result).toBe(18);
    });
  });

  describe('myRsvp field resolver', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the occurrence-backed RSVP for a single-date event series', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };

      const result = await resolver.myRsvp(event, contextWithUser);

      expect(result).toEqual(
        expect.objectContaining({
          participantId: 'occ-participant-1',
          eventId: 'event1',
          userId: 'user1',
          status: ParticipantStatus.Going,
        }),
      );
    });

    it('should return the occurrence-backed RSVP for a recurring event series', async () => {
      const event = {
        eventId: 'event1',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TH',
        },
      } as EventSeries;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };

      const result = await resolver.myRsvp(event, contextWithUser);

      expect(result).toEqual(
        expect.objectContaining({
          participantId: 'occ-participant-1',
          eventId: 'event1',
          userId: 'user1',
          status: ParticipantStatus.Going,
        }),
      );
    });

    it('should return null when the single-date event has no occurrence RSVP', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const contextWithUser = { ...mockContext, user: { userId: 'user1' } as User };
      mockMyOccurrenceParticipantLoader = new DataLoader(async () => [null]);
      contextWithUser.loaders.myEventOccurrenceParticipant = mockMyOccurrenceParticipantLoader as any;

      const result = await resolver.myRsvp(event, contextWithUser);

      expect(result).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      const event = { eventId: 'event1' } as EventSeries;
      const contextWithoutUser = { ...mockContext, user: undefined };

      const result = await resolver.myRsvp(event, contextWithoutUser);

      expect(result).toBeNull();
    });
  });

  describe('ensureUserCanUseOrganization helper', () => {
    const orgId = 'org-123';
    const userId = 'user-123';
    let ensureAccess: (orgId: string, userId: string) => Promise<void>;

    beforeEach(() => {
      jest.clearAllMocks();
      ensureAccess = resolver.ensureUserCanUseOrganization.bind(resolver);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('throws when the user has no membership for the org', async () => {
      (OrganizationMembershipDAO.readMembershipByOrgIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(ensureAccess(orgId, userId)).rejects.toThrow(
        'You do not have permission to create or update events for that organization.',
      );
    });

    it('throws when the membership role is not allowed', async () => {
      const membership: OrganizationMembership = {
        membershipId: 'membership-1',
        orgId,
        userId,
        role: OrganizationRole.Member,
        joinedAt: new Date(),
      };
      (OrganizationMembershipDAO.readMembershipByOrgIdAndUser as jest.Mock).mockResolvedValue(membership);

      await expect(ensureAccess(orgId, userId)).rejects.toThrow(
        'You do not have permission to create or update events for that organization.',
      );
    });

    it('resolves when the membership role is allowed', async () => {
      const membership: OrganizationMembership = {
        membershipId: 'membership-2',
        orgId,
        userId,
        role: OrganizationRole.Host,
        joinedAt: new Date(),
      };
      (OrganizationMembershipDAO.readMembershipByOrgIdAndUser as jest.Mock).mockResolvedValue(membership);

      await expect(ensureAccess(orgId, userId)).resolves.toBeUndefined();
    });
  });

  describe('readTrendingEvents', () => {
    const makeEvent = (overrides: Partial<EventSeries> = {}): EventSeries =>
      ({ eventId: 'event-1', title: 'Test', ...overrides }) as EventSeries;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns events from EventSeriesService.readTrending with the provided limit', async () => {
      const mockEvents = [makeEvent({ eventId: 'e-1' }), makeEvent({ eventId: 'e-2' })];
      (EventSeriesService.readTrending as jest.Mock).mockResolvedValue(mockEvents);

      const result = await resolver.readTrendingEvents(5);

      expect(EventSeriesService.readTrending).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockEvents);
    });

    it('falls back to limit 10 when limit is null', async () => {
      (EventSeriesService.readTrending as jest.Mock).mockResolvedValue([]);

      await resolver.readTrendingEvents(null);

      expect(EventSeriesService.readTrending).toHaveBeenCalledWith(10);
    });

    it('clamps limit to 1 when a value below 1 is provided', async () => {
      (EventSeriesService.readTrending as jest.Mock).mockResolvedValue([]);

      await resolver.readTrendingEvents(0);

      expect(EventSeriesService.readTrending).toHaveBeenCalledWith(1);
    });

    it('returns an empty array when no trending events exist', async () => {
      (EventSeriesService.readTrending as jest.Mock).mockResolvedValue([]);

      const result = await resolver.readTrendingEvents(10);

      expect(result).toEqual([]);
    });

    it('propagates errors from EventSeriesService.readTrending', async () => {
      (EventSeriesService.readTrending as jest.Mock).mockRejectedValue(new Error('service error'));

      await expect(resolver.readTrendingEvents(10)).rejects.toThrow('service error');
    });
  });
});
