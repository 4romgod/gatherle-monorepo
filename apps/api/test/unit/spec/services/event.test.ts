import EventService from '@/services/event';
import type { Event } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventDAO: {
    readTrending: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EventDAO } from '@/mongodb/dao';

const makeEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    eventId: 'event-1',
    title: 'Test Event',
    rsvpCount: 5,
    savedByCount: 2,
    ...overrides,
  }) as Event;

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readTrending', () => {
    it('delegates to EventDAO.readTrending with the provided limit', async () => {
      const mockEvents = [makeEvent({ eventId: 'e-1' }), makeEvent({ eventId: 'e-2' })];
      (EventDAO.readTrending as jest.Mock).mockResolvedValue(mockEvents);

      const result = await EventService.readTrending(5);

      expect(EventDAO.readTrending).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockEvents);
    });

    it('uses the default limit of 10 when no argument is supplied', async () => {
      (EventDAO.readTrending as jest.Mock).mockResolvedValue([]);

      await EventService.readTrending();

      expect(EventDAO.readTrending).toHaveBeenCalledWith(10);
    });

    it('returns an empty array when the DAO returns no events', async () => {
      (EventDAO.readTrending as jest.Mock).mockResolvedValue([]);

      const result = await EventService.readTrending(10);

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by EventDAO.readTrending', async () => {
      const error = new Error('DB failure');
      (EventDAO.readTrending as jest.Mock).mockRejectedValue(error);

      await expect(EventService.readTrending(10)).rejects.toThrow('DB failure');
    });
  });
});
