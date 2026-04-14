import RecommendationService from '@/services/recommendation';
import { FeedReason, FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  UserDAO: {
    readUserById: jest.fn(),
  },
  EventDAO: {
    readUpcomingPublished: jest.fn(),
  },
  EventParticipantDAO: {
    readByUser: jest.fn(),
    readByUserIds: jest.fn(),
  },
  FollowDAO: {
    readFollowingForUser: jest.fn(),
    readSavedEventsByUserIds: jest.fn(),
  },
  UserFeedDAO: {
    clearFeedForUser: jest.fn(),
    bulkUpsertFeedItems: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { UserDAO, EventDAO, EventParticipantDAO, FollowDAO, UserFeedDAO } from '@/mongodb/dao';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  email: 'u@test.com',
  interests: ['cat-a'],
  mutedOrgIds: [],
  mutedUserIds: [],
  ...overrides,
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  eventId: 'event-1',
  title: 'Test Event',
  lifecycleStatus: 'Published',
  status: 'Upcoming',
  visibility: 'Public',
  eventCategories: ['cat-a'],
  orgId: 'org-1',
  rsvpCount: 0,
  savedByCount: 0,
  primarySchedule: { startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1_000) },
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1_000),
  ...overrides,
});

const makeParticipant = (userId: string, eventId: string) => ({
  participantId: `p-${userId}-${eventId}`,
  userId,
  eventId,
  status: ParticipantStatus.Going,
});

const makeFollow = (targetType: FollowTargetType, targetId: string, followerUserId = 'user-1') => ({
  followId: `f-${targetId}`,
  followerUserId,
  targetType,
  targetId,
  approvalStatus: FollowApprovalStatus.Accepted,
});

const DEFAULT_STUBS = () => {
  (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser());
  (EventParticipantDAO.readByUser as jest.Mock).mockResolvedValue([]);
  (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);
  (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([]);
  (EventParticipantDAO.readByUserIds as jest.Mock).mockResolvedValue([]);
  (FollowDAO.readSavedEventsByUserIds as jest.Mock).mockResolvedValue([]);
  (UserFeedDAO.clearFeedForUser as jest.Mock).mockResolvedValue(undefined);
  (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mockResolvedValue(undefined);
};

describe('RecommendationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DEFAULT_STUBS();
  });

  describe('isFeedStale', () => {
    it('returns true when feed is empty', () => {
      expect(RecommendationService.isFeedStale([])).toBe(true);
    });

    it('returns false for a recently computed feed', () => {
      const items = [{ computedAt: new Date(Date.now() - 1 * 60 * 60 * 1_000) }]; // 1 hour ago
      expect(RecommendationService.isFeedStale(items)).toBe(false);
    });

    it('returns true when oldest item exceeds 24h threshold', () => {
      const items = [
        { computedAt: new Date(Date.now() - 25 * 60 * 60 * 1_000) }, // 25 hours ago
      ];
      expect(RecommendationService.isFeedStale(items)).toBe(true);
    });

    it('uses the oldest computedAt across items', () => {
      const items = [
        { computedAt: new Date(Date.now() - 2 * 60 * 60 * 1_000) }, // 2h — fresh
        { computedAt: new Date(Date.now() - 25 * 60 * 60 * 1_000) }, // 25h — stale
      ];
      expect(RecommendationService.isFeedStale(items)).toBe(true);
    });
  });

  describe('computeFeedForUser', () => {
    it('does nothing when no candidate events exist', async () => {
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.clearFeedForUser).toHaveBeenCalledWith('user-1');
      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('excludes events the user has already RSVPd to', async () => {
      const event = makeEvent({ eventId: 'event-1', eventCategories: ['cat-a'] });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      (EventParticipantDAO.readByUser as jest.Mock).mockResolvedValue([makeParticipant('user-1', 'event-1')]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('excludes events from muted organisations', async () => {
      const event = makeEvent({ orgId: 'muted-org', eventCategories: ['cat-a'] });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ mutedOrgIds: ['muted-org'] }));
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('excludes events already saved by the user', async () => {
      const event = makeEvent({ eventId: 'event-saved', eventCategories: ['cat-a'] });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        makeFollow(FollowTargetType.Event, 'event-saved'),
      ]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('awards CategoryMatch score when event matches user interests', async () => {
      const event = makeEvent({ eventId: 'event-1', eventCategories: ['cat-a'], orgId: null });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: ['cat-a'] }));
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items).toHaveLength(1);
      expect(items[0].score).toBeGreaterThanOrEqual(30);
      expect(items[0].reasons).toContain(FeedReason.CategoryMatch);
    });

    it('awards FriendAttending score when a followed user has RSVPd', async () => {
      const event = makeEvent({ eventId: 'event-1', eventCategories: [], orgId: null });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([makeFollow(FollowTargetType.User, 'friend-1')]);
      (EventParticipantDAO.readByUserIds as jest.Mock).mockResolvedValue([makeParticipant('friend-1', 'event-1')]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].reasons).toContain(FeedReason.FriendAttending);
      expect(items[0].score).toBeGreaterThanOrEqual(25);
    });

    it('caps FriendAttending at 50 pts regardless of friend count', async () => {
      // Override defaults to suppress all other signals:
      // - empty categories → no CategoryMatch
      // - orgId null → no FollowedOrg
      // - stale createdAt → no Freshness
      // - far future startAt → no TimeUrgency
      // - rsvpCount/savedByCount 0 → no Popularity
      const event = makeEvent({
        eventId: 'event-1',
        eventCategories: [],
        orgId: null,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000),
        primarySchedule: { startAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1_000) },
        rsvpCount: 0,
        savedByCount: 0,
      });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: [] }));
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      const friends = ['f1', 'f2', 'f3', 'f4'].map((id) => makeFollow(FollowTargetType.User, id));
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue(friends);
      // 4 friends all attending — 4 × 25 = 100, capped at 50
      const participations = ['f1', 'f2', 'f3', 'f4'].map((id) => makeParticipant(id, 'event-1'));
      (EventParticipantDAO.readByUserIds as jest.Mock).mockResolvedValue(participations);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      // Only FriendAttending fires; capped at 50
      expect(items[0].score).toBe(50);
      expect(items[0].reasons).toContain(FeedReason.FriendAttending);
    });

    it('awards FollowedOrgHosting score when followed org is hosting', async () => {
      const event = makeEvent({ eventId: 'event-1', eventCategories: [], orgId: 'org-1' });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        makeFollow(FollowTargetType.Organization, 'org-1'),
      ]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].reasons).toContain(FeedReason.FollowedOrgHosting);
    });

    it('awards TimeUrgency for events starting within 7 days', async () => {
      const event = makeEvent({
        eventId: 'event-1',
        eventCategories: [],
        orgId: null,
        primarySchedule: { startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000) }, // 3 days out
      });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);
      // Need some score to be included — give it a category match
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: [] }));
      // But time urgency fires independent of other signals; add category match to ensure inclusion
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: [] }));
      // Force inclusion by giving category match
      const eventWithCategory = { ...event, eventCategories: ['cat-a'] };
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([eventWithCategory]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].reasons).toContain(FeedReason.TimeUrgency);
    });

    it('awards Freshness for events created within 7 days', async () => {
      const event = makeEvent({
        eventId: 'event-1',
        eventCategories: ['cat-a'],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1_000), // 1 day ago
      });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].reasons).toContain(FeedReason.Freshness);
    });

    it('stores zero-signal events via cold-start fallback with score 1 (floor)', async () => {
      // Event with no matching signals — personalised score is 0 so cold-start kicks in
      const event = makeEvent({ eventId: 'event-zero', eventCategories: ['unknown-cat'], orgId: null });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: ['different-cat'] }));
      const staleCreatedAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1_000);
      const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1_000);
      const eventWithNoSignals = {
        ...event,
        createdAt: staleCreatedAt,
        primarySchedule: { startAt: farFuture },
        rsvpCount: 0,
        savedByCount: 0,
      };
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([eventWithNoSignals]);

      await RecommendationService.computeFeedForUser('user-1');

      // Cold-start stores the candidate with floor score 1 and Popularity reason
      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items).toHaveLength(1);
      expect(items[0].eventId).toBe('event-zero');
      expect(items[0].score).toBe(1);
      expect(items[0].reasons).toEqual([FeedReason.Popularity]);
    });

    it('clears existing feed before writing new items', async () => {
      const event = makeEvent({ eventCategories: ['cat-a'] });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);

      await RecommendationService.computeFeedForUser('user-1');

      const clearOrder = (UserFeedDAO.clearFeedForUser as jest.Mock).mock.invocationCallOrder[0];
      const upsertOrder = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.invocationCallOrder[0];
      expect(clearOrder).toBeLessThan(upsertOrder);
    });

    it('does not call readByUserIds when user has no followed users', async () => {
      // Only org follows — no user follows
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        makeFollow(FollowTargetType.Organization, 'org-1'),
      ]);
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([makeEvent()]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(EventParticipantDAO.readByUserIds).not.toHaveBeenCalled();
      expect(FollowDAO.readSavedEventsByUserIds).not.toHaveBeenCalled();
    });

    it('swallows errors and does not throw', async () => {
      (UserDAO.readUserById as jest.Mock).mockRejectedValue(new Error('DB exploded'));

      await expect(RecommendationService.computeFeedForUser('user-1')).resolves.toBeUndefined();
    });
  });

  describe('onUserFollowed', () => {
    it('triggers computeFeedForUser for the follower', async () => {
      const spy = jest.spyOn(RecommendationService, 'computeFeedForUser').mockResolvedValue(undefined);

      await RecommendationService.onUserFollowed('user-1');

      // void-wrapped, so we wait a tick
      await new Promise((r) => setTimeout(r, 0));
      expect(spy).toHaveBeenCalledWith('user-1');
      spy.mockRestore();
    });
  });

  describe('onEventPublished', () => {
    it('resolves without error (lazy recompute strategy)', async () => {
      await expect(RecommendationService.onEventPublished('event-1')).resolves.toBeUndefined();
    });
  });

  describe('cold-start fallback (no personalisation signals)', () => {
    // An event that produces score=0: wrong category, null org, no popularity, not fresh, no urgency.
    const makeZeroSignalEvent = (overrides: Record<string, unknown> = {}) =>
      makeEvent({
        eventCategories: ['unmatched-cat'],
        orgId: null,
        rsvpCount: 0,
        savedByCount: 0,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000),
        primarySchedule: { startAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1_000) },
        ...overrides,
      });

    beforeEach(() => {
      // User has a different interest to ensure no CategoryMatch.
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: ['other-cat'] }));
    });

    it('stores candidateEvents as fallback items with Popularity reason', async () => {
      const candidate = makeZeroSignalEvent({ eventId: 'candidate-1' });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([candidate]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items).toHaveLength(1);
      expect(items[0].eventId).toBe('candidate-1');
      expect(items[0].reasons).toEqual([FeedReason.Popularity]);
    });

    it('assigns score 1 (floor) to candidates with no popularity signal', async () => {
      const candidate = makeZeroSignalEvent({ eventId: 'candidate-1', rsvpCount: 0, savedByCount: 0 });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([candidate]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].score).toBe(1);
    });

    it('sorts fallback candidates by popularity descending', async () => {
      const low = makeZeroSignalEvent({ eventId: 'low', rsvpCount: 1, savedByCount: 0 });
      const high = makeZeroSignalEvent({ eventId: 'high', rsvpCount: 3, savedByCount: 0 });
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([low, high]);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].eventId).toBe('high');
      expect(items[1].eventId).toBe('low');
    });

    it('slices fallback to at most COLD_START_FALLBACK_LIMIT (20) candidates', async () => {
      const candidates = Array.from({ length: 25 }, (_, i) => makeZeroSignalEvent({ eventId: `e-${i}` }));
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue(candidates);

      await RecommendationService.computeFeedForUser('user-1');

      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items.length).toBeLessThanOrEqual(20);
    });

    it('excludes already RSVPd events from the fallback', async () => {
      (EventParticipantDAO.readByUser as jest.Mock).mockResolvedValue([makeParticipant('user-1', 'candidate-1')]);
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([
        makeZeroSignalEvent({ eventId: 'candidate-1' }),
      ]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('excludes already saved events from the fallback', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        makeFollow(FollowTargetType.Event, 'candidate-1'),
      ]);
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([
        makeZeroSignalEvent({ eventId: 'candidate-1' }),
      ]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('excludes events from muted organisations from the fallback', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(
        makeUser({ mutedOrgIds: ['muted-org'], interests: ['other-cat'] }),
      );
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([
        makeZeroSignalEvent({ eventId: 'candidate-1', orgId: 'muted-org' }),
      ]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('does not call bulkUpsertFeedItems when no candidateEvents remain after filtering', async () => {
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([]);

      await RecommendationService.computeFeedForUser('user-1');

      expect(UserFeedDAO.bulkUpsertFeedItems).not.toHaveBeenCalled();
    });

    it('does not enter cold-start when personalised items have score > 0', async () => {
      // Category match fires — there will be scored items.
      const event = makeEvent({ eventId: 'event-1', eventCategories: ['cat-a'] });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(makeUser({ interests: ['cat-a'] }));
      (EventDAO.readUpcomingPublished as jest.Mock).mockResolvedValue([event]);

      await RecommendationService.computeFeedForUser('user-1');

      // bulkUpsertFeedItems called with the scored item, not a fallback FeedReason.Popularity item
      const items = (UserFeedDAO.bulkUpsertFeedItems as jest.Mock).mock.calls[0][0];
      expect(items[0].reasons).not.toEqual([FeedReason.Popularity]);
    });
  });
});
