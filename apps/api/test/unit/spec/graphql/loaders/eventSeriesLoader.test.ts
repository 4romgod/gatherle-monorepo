import { createEventSeriesLoader } from '@/graphql/loaders';
import { FollowDAO } from '@/mongodb/dao';
import { EventSeries as EventSeriesModel } from '@/mongodb/models';
import type { EventSeries } from '@gatherle/commons/server/types';

jest.mock('@/mongodb/models', () => ({
  EventSeries: {
    find: jest.fn(),
  },
}));

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    countSavesForEvents: jest.fn(),
    readSavedEventIdsForUser: jest.fn(),
  },
}));

describe('EventSeriesLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FollowDAO.countSavesForEvents as jest.Mock).mockResolvedValue(new Map());
    (FollowDAO.readSavedEventIdsForUser as jest.Mock).mockResolvedValue(new Set());
  });

  it('should batch load events by ID', async () => {
    const mockEvents: Array<Partial<EventSeries> & { _id: string }> = [
      {
        _id: 'event1',
        eventId: 'event1',
        title: 'EventSeries 1',
      },
      {
        _id: 'event2',
        eventId: 'event2',
        title: 'EventSeries 2',
      },
    ];
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockEvents),
    };
    (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventSeriesLoader();
    const results = await Promise.all([loader.load('event1'), loader.load('event2'), loader.load('event3')]);
    expect(EventSeriesModel.find).toHaveBeenCalledTimes(1);
    expect(EventSeriesModel.find).toHaveBeenCalledWith({ _id: { $in: ['event1', 'event2', 'event3'] } });
    expect(results[0]).toMatchObject(mockEvents[0]);
    expect(results[1]).toMatchObject(mockEvents[1]);
    expect(results[2]).toBeNull();
  });

  it('preloads savedByCount and isSavedByMe for the authenticated user', async () => {
    const mockEvents: Array<Partial<EventSeries> & { _id: string }> = [
      {
        _id: 'event1',
        eventId: 'event1',
        title: 'EventSeries 1',
      },
      {
        _id: 'event2',
        eventId: 'event2',
        title: 'EventSeries 2',
      },
    ];
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockEvents),
    };

    (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);
    (FollowDAO.countSavesForEvents as jest.Mock).mockResolvedValue(
      new Map([
        ['event1', 4],
        ['event2', 1],
      ]),
    );
    (FollowDAO.readSavedEventIdsForUser as jest.Mock).mockResolvedValue(new Set(['event2']));

    const loader = createEventSeriesLoader('user-1');
    const [first, second] = await Promise.all([loader.load('event1'), loader.load('event2')]);

    expect(FollowDAO.countSavesForEvents).toHaveBeenCalledWith(['event1', 'event2']);
    expect(FollowDAO.readSavedEventIdsForUser).toHaveBeenCalledWith('user-1', ['event1', 'event2']);
    expect(first).toMatchObject({
      eventId: 'event1',
      savedByCount: 4,
      isSavedByMe: false,
    });
    expect(second).toMatchObject({
      eventId: 'event2',
      savedByCount: 1,
      isSavedByMe: true,
    });
  });

  it('should handle empty input', async () => {
    const loader = createEventSeriesLoader();
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
  });

  it('should cache results within the same loader instance', async () => {
    const mockEvent: Partial<EventSeries> & { _id: string } = {
      _id: 'event1',
      eventId: 'event1',
      title: 'EventSeries 1',
    };
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockEvent]),
    };
    (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventSeriesLoader();
    await loader.load('event1');
    await loader.load('event1');
    expect(EventSeriesModel.find).toHaveBeenCalledTimes(1);
  });

  it('should maintain correct order when database returns results in different order', async () => {
    const mockEvents: Array<Partial<EventSeries> & { _id: string }> = [
      { _id: 'event2', eventId: 'event2', title: 'EventSeries 2' },
      { _id: 'event1', eventId: 'event1', title: 'EventSeries 1' },
      { _id: 'event3', eventId: 'event3', title: 'EventSeries 3' },
    ];
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockEvents),
    };
    (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventSeriesLoader();
    const results = await Promise.all([loader.load('event1'), loader.load('event2'), loader.load('event3')]);
    expect((results[0] as Partial<EventSeries> & { _id: string })?._id).toBe('event1');
    expect((results[1] as Partial<EventSeries> & { _id: string })?._id).toBe('event2');
    expect((results[2] as Partial<EventSeries> & { _id: string })?._id).toBe('event3');
  });

  it('should handle database errors gracefully', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    };
    (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventSeriesLoader();
    await expect(loader.load('event1')).rejects.toThrow('Database error');
  });
});
