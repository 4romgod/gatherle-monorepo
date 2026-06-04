import type { EventMoment, EventSeries } from '@gatherle/commons/types';
import { EventMomentState, EventMomentType } from '@gatherle/commons/types';
import { EventSeriesDAO, UserDAO } from '@/mongodb/dao';
import {
  buildRealtimeMomentSnapshot,
  publishMomentCreatedForScopedRecipients,
  publishMomentDeletedForScopedRecipients,
  publishMomentUpdatedForScopedRecipients,
} from '@/services/eventMomentRealtime';
import { logger } from '@/utils/logger';
import {
  publishMomentCreatedToRecipients,
  publishMomentDeletedToRecipients,
  publishMomentUpdatedToRecipients,
} from '@/websocket/publisher';

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    readEventById: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

jest.mock('@/websocket/publisher', () => ({
  publishMomentCreatedToRecipients: jest.fn().mockResolvedValue(undefined),
  publishMomentUpdatedToRecipients: jest.fn().mockResolvedValue(undefined),
  publishMomentDeletedToRecipients: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

type RealtimeEventContext = Pick<EventSeries, 'eventId' | 'organizers' | 'slug' | 'title'>;

const mockMoment: EventMoment = {
  momentId: 'moment-1',
  eventId: 'event-1',
  occurrenceId: 'event-1#2026-06-04T12:00:00.000Z',
  authorId: 'author-1',
  type: EventMomentType.Text,
  state: EventMomentState.Ready,
  caption: 'Hello world',
  isPublished: true,
  expiresAt: new Date('2026-06-05T12:00:00.000Z'),
  createdAt: new Date('2026-06-04T12:00:00.000Z'),
};

const mockAuthor = {
  userId: 'author-1',
  username: 'alice',
  given_name: 'Alice',
  family_name: 'Smith',
  profile_picture: null,
};

const makeRealtimeEvent = (overrides: Partial<RealtimeEventContext> = {}): RealtimeEventContext =>
  ({
    eventId: 'event-1',
    slug: 'test-event',
    title: 'Test Event',
    organizers: [{ user: 'organizer-1' }, { user: { userId: 'organizer-2' } }],
    ...overrides,
  }) as RealtimeEventContext;

describe('eventMomentRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockAuthor);
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(makeRealtimeEvent());
  });

  describe('buildRealtimeMomentSnapshot', () => {
    it('loads the event when no realtime event context is provided', async () => {
      const snapshot = await buildRealtimeMomentSnapshot(mockMoment);

      expect(EventSeriesDAO.readEventById).toHaveBeenCalledWith('event-1');
      expect(snapshot).toEqual(
        expect.objectContaining({
          momentId: 'moment-1',
          eventId: 'event-1',
          occurrenceId: 'event-1#2026-06-04T12:00:00.000Z',
          authorId: 'author-1',
          type: EventMomentType.Text,
          state: EventMomentState.Ready,
          caption: 'Hello world',
          expiresAt: '2026-06-05T12:00:00.000Z',
          createdAt: '2026-06-04T12:00:00.000Z',
          author: expect.objectContaining({
            userId: 'author-1',
            username: 'alice',
          }),
          event: {
            eventId: 'event-1',
            slug: 'test-event',
            title: 'Test Event',
          },
        }),
      );
    });

    it('logs and throws when event lookup fails', async () => {
      const lookupError = new Error('lookup failed');
      (EventSeriesDAO.readEventById as jest.Mock).mockRejectedValueOnce(lookupError);

      await expect(buildRealtimeMomentSnapshot(mockMoment)).rejects.toThrow(
        'Unable to load event event-1 for realtime moment snapshot',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        '[eventMomentRealtime] Failed to load event while resolving realtime recipients',
        expect.objectContaining({
          error: lookupError,
          eventId: 'event-1',
        }),
      );
    });
  });

  describe('publishMomentCreatedForScopedRecipients', () => {
    it('dedupes recipients and ignores malformed organizer user shapes', async () => {
      const event = makeRealtimeEvent({
        organizers: [
          { user: ' author-1 ' },
          { user: ' organizer-1 ' },
          { user: { userId: ' organizer-2 ' } },
          { user: { _id: { toString: () => ' organizer-3 ' } } },
          { user: { toString: () => ' organizer-4 ' } },
          { user: { toString: () => '[object Object]' } },
          { user: '' },
          { user: '   ' },
          { user: undefined },
        ],
      });

      await publishMomentCreatedForScopedRecipients(mockMoment, event);

      expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
      expect(publishMomentCreatedToRecipients).toHaveBeenCalledWith(
        ['author-1', 'organizer-1', 'organizer-2', 'organizer-3', 'organizer-4'],
        {
          moment: expect.objectContaining({
            event: expect.objectContaining({
              eventId: 'event-1',
              title: 'Test Event',
            }),
          }),
        },
      );
    });
  });

  describe('publishMomentUpdatedForScopedRecipients', () => {
    it('uses the provided event context without reloading the event', async () => {
      const event = makeRealtimeEvent({
        slug: 'provided-event',
        title: 'Provided Event',
      });

      await publishMomentUpdatedForScopedRecipients(mockMoment, event);

      expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
      expect(publishMomentUpdatedToRecipients).toHaveBeenCalledWith(['author-1', 'organizer-1', 'organizer-2'], {
        moment: expect.objectContaining({
          event: {
            eventId: 'event-1',
            slug: 'provided-event',
            title: 'Provided Event',
          },
        }),
      });
    });
  });

  describe('publishMomentDeletedForScopedRecipients', () => {
    it('falls back to the author only when event lookup fails', async () => {
      const lookupError = new Error('event unavailable');
      (EventSeriesDAO.readEventById as jest.Mock).mockRejectedValueOnce(lookupError);

      await publishMomentDeletedForScopedRecipients(mockMoment);

      expect(logger.warn).toHaveBeenCalledWith(
        '[eventMomentRealtime] Failed to load event while resolving realtime recipients',
        expect.objectContaining({
          error: lookupError,
          eventId: 'event-1',
        }),
      );
      expect(publishMomentDeletedToRecipients).toHaveBeenCalledWith(['author-1'], {
        momentId: 'moment-1',
        eventId: 'event-1',
        occurrenceId: 'event-1#2026-06-04T12:00:00.000Z',
        authorId: 'author-1',
      });
    });
  });
});
