import { createEventLoader } from '@/graphql/loaders';
import { Event as EventModel } from '@/mongodb/models';
import type { Event } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  Event: {
    find: jest.fn(),
  },
}));

describe('EventLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should batch load events by ID', async () => {
    const mockEvents: Array<Partial<Event> & { _id: string }> = [
      {
        _id: 'event1',
        eventId: 'event1',
        title: 'Event 1',
      },
      {
        _id: 'event2',
        eventId: 'event2',
        title: 'Event 2',
      },
    ];
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockEvents),
    };
    (EventModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventLoader();
    const results = await Promise.all([loader.load('event1'), loader.load('event2'), loader.load('event3')]);
    expect(EventModel.find).toHaveBeenCalledTimes(1);
    expect(EventModel.find).toHaveBeenCalledWith({ _id: { $in: ['event1', 'event2', 'event3'] } });
    expect(results[0]).toEqual(mockEvents[0]);
    expect(results[1]).toEqual(mockEvents[1]);
    expect(results[2]).toBeNull();
  });

  it('should handle empty input', async () => {
    const loader = createEventLoader();
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
  });

  it('should cache results within the same loader instance', async () => {
    const mockEvent: Partial<Event> & { _id: string } = {
      _id: 'event1',
      eventId: 'event1',
      title: 'Event 1',
    };
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockEvent]),
    };
    (EventModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventLoader();
    await loader.load('event1');
    await loader.load('event1');
    expect(EventModel.find).toHaveBeenCalledTimes(1);
  });

  it('should maintain correct order when database returns results in different order', async () => {
    const mockEvents: Array<Partial<Event> & { _id: string }> = [
      { _id: 'event2', eventId: 'event2', title: 'Event 2' },
      { _id: 'event1', eventId: 'event1', title: 'Event 1' },
      { _id: 'event3', eventId: 'event3', title: 'Event 3' },
    ];
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockEvents),
    };
    (EventModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventLoader();
    const results = await Promise.all([loader.load('event1'), loader.load('event2'), loader.load('event3')]);
    expect((results[0] as Partial<Event> & { _id: string })?._id).toBe('event1');
    expect((results[1] as Partial<Event> & { _id: string })?._id).toBe('event2');
    expect((results[2] as Partial<Event> & { _id: string })?._id).toBe('event3');
  });

  it('should handle database errors gracefully', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    };
    (EventModel.find as jest.Mock).mockReturnValue(mockQuery);
    const loader = createEventLoader();
    await expect(loader.load('event1')).rejects.toThrow('Database error');
  });
});
