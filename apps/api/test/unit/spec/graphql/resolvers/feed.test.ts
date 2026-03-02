import 'reflect-metadata';
import { FeedResolver } from '@/graphql/resolvers/feed';
import type { UserFeedItem, User } from '@gatherle/commons/types';
import { FeedReason, UserRole } from '@gatherle/commons/types';
import { createMockContext } from '../../../../utils/mockContext';

jest.mock('@/mongodb/dao', () => {
  class EventParticipantDAO {
    static readByEvents = jest.fn();
  }
  class UserFeedDAO {
    static readFeedForUser = jest.fn();
  }
  return { EventParticipantDAO, UserFeedDAO };
});

jest.mock('@/services/recommendation', () => ({
  __esModule: true,
  default: {
    computeFeedForUser: jest.fn(),
    isFeedStale: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  initLogger: jest.fn(),
}));

import { UserFeedDAO } from '@/mongodb/dao';
import RecommendationService from '@/services/recommendation';

const mockUser: User = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'tester',
  birthdate: '1990-01-01',
  given_name: 'Test',
  family_name: 'User',
  password: 'secret',
  userRole: UserRole.User,
};

const makeFeedItem = (overrides: Partial<UserFeedItem> = {}): UserFeedItem => ({
  feedItemId: 'feed-1',
  userId: 'user-1',
  eventId: 'event-1',
  score: 55,
  reasons: [FeedReason.CategoryMatch],
  computedAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
  ...overrides,
});

describe('FeedResolver', () => {
  let resolver: FeedResolver;
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    resolver = new FeedResolver();
    ctx = createMockContext({ user: mockUser });
    jest.clearAllMocks();

    // Default stubs
    (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue([]);
    (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);
    (RecommendationService.isFeedStale as jest.Mock).mockReturnValue(false);
  });

  describe('readRecommendedFeed', () => {
    it('computes feed synchronously when cache is empty and returns result', async () => {
      const freshItems = [makeFeedItem()];
      // First call returns empty (miss), second call returns computed items
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce(freshItems);

      const result = await resolver.readRecommendedFeed(50, 0, ctx);

      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith('user-1');
      expect(UserFeedDAO.readFeedForUser).toHaveBeenCalledTimes(2);
      expect(result).toEqual(freshItems);
    });

    it('returns cached items when feed is fresh (no background refresh)', async () => {
      const cachedItems = [makeFeedItem()];
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue(cachedItems);
      (RecommendationService.isFeedStale as jest.Mock).mockReturnValue(false);

      const result = await resolver.readRecommendedFeed(50, 0, ctx);

      expect(RecommendationService.computeFeedForUser).not.toHaveBeenCalled();
      expect(result).toEqual(cachedItems);
    });

    it('returns cached items and triggers background refresh when stale', async () => {
      const staleItems = [makeFeedItem()];
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue(staleItems);
      (RecommendationService.isFeedStale as jest.Mock).mockReturnValue(true);

      const result = await resolver.readRecommendedFeed(50, 0, ctx);

      // Returns immediately with cached data
      expect(result).toEqual(staleItems);
      // Fires background refresh (fire-and-forget — may not have run yet)
      await new Promise((r) => setTimeout(r, 0));
      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith('user-1');
    });

    it('passes limit and skip to the DAO', async () => {
      const items = [makeFeedItem()];
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue(items);

      await resolver.readRecommendedFeed(10, 20, ctx);

      expect(UserFeedDAO.readFeedForUser).toHaveBeenCalledWith('user-1', 10, 20);
    });

    it('clamps a negative limit to 0', async () => {
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue([]);

      await resolver.readRecommendedFeed(-5, 0, ctx);

      expect(UserFeedDAO.readFeedForUser).toHaveBeenCalledWith('user-1', 0, 0);
    });

    it('clamps limit exceeding MAX_FEED_LIMIT (50) down to 50', async () => {
      const items = [makeFeedItem()];
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue(items);

      await resolver.readRecommendedFeed(9999, 0, ctx);

      expect(UserFeedDAO.readFeedForUser).toHaveBeenCalledWith('user-1', 50, 0);
    });

    it('clamps a negative skip to 0', async () => {
      const items = [makeFeedItem()];
      (UserFeedDAO.readFeedForUser as jest.Mock).mockResolvedValue(items);

      await resolver.readRecommendedFeed(10, -10, ctx);

      expect(UserFeedDAO.readFeedForUser).toHaveBeenCalledWith('user-1', 10, 0);
    });
  });

  describe('refreshFeed', () => {
    it('calls computeFeedForUser and returns true', async () => {
      (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.refreshFeed(ctx);

      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('propagates errors from the recommendation service', async () => {
      const err = new Error('compute failed');
      (RecommendationService.computeFeedForUser as jest.Mock).mockRejectedValue(err);

      await expect(resolver.refreshFeed(ctx)).rejects.toThrow(err);
    });
  });

  describe('reasons', () => {
    it('returns the reasons array from the feed item', () => {
      const item = makeFeedItem({ reasons: [FeedReason.FriendAttending, FeedReason.Popularity] });
      const result = resolver.reasons(item);
      expect(result).toEqual([FeedReason.FriendAttending, FeedReason.Popularity]);
    });

    it('returns empty array when reasons is nullish', () => {
      const item = makeFeedItem({ reasons: undefined as unknown as FeedReason[] });
      const result = resolver.reasons(item);
      expect(result).toEqual([]);
    });
  });

  describe('event', () => {
    it('loads event via DataLoader', async () => {
      const mockEvent = { eventId: 'event-1', title: 'Test' } as any;
      const loaderSpy = jest.spyOn(ctx.loaders.event, 'load').mockResolvedValue(mockEvent);

      const item = makeFeedItem({ eventId: 'event-1' });
      const result = await resolver.event(item, ctx);

      expect(loaderSpy).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(mockEvent);
    });

    it('returns null when DataLoader throws', async () => {
      jest.spyOn(ctx.loaders.event, 'load').mockRejectedValue(new Error('loader error'));

      const item = makeFeedItem({ eventId: 'event-1' });
      const result = await resolver.event(item, ctx);

      expect(result).toBeNull();
    });
  });
});
