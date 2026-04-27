import EventSeriesService from '@/services/eventSeries';
import type { EventSeries } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    readTrending: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EventSeriesDAO } from '@/mongodb/dao';

const makeEvent = (overrides: Partial<EventSeries> = {}): EventSeries =>
  ({
    eventId: 'event-1',
    title: 'Test EventSeries',
    rsvpCount: 5,
    savedByCount: 2,
    ...overrides,
  }) as EventSeries;

describe('EventSeriesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readTrending', () => {
    it('delegates to EventSeriesDAO.readTrending with the provided limit', async () => {
      const mockEvents = [makeEvent({ eventId: 'e-1' }), makeEvent({ eventId: 'e-2' })];
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue(mockEvents);

      const result = await EventSeriesService.readTrending(5);

      expect(EventSeriesDAO.readTrending).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockEvents);
    });

    it('uses the default limit of 10 when no argument is supplied', async () => {
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue([]);

      await EventSeriesService.readTrending();

      expect(EventSeriesDAO.readTrending).toHaveBeenCalledWith(10);
    });

    it('returns an empty array when the DAO returns no events', async () => {
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue([]);

      const result = await EventSeriesService.readTrending(10);

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by EventSeriesDAO.readTrending', async () => {
      const error = new Error('DB failure');
      (EventSeriesDAO.readTrending as jest.Mock).mockRejectedValue(error);

      await expect(EventSeriesService.readTrending(10)).rejects.toThrow('DB failure');
    });
  });
});
