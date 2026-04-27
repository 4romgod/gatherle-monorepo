import { createEventSeriesParticipantLoader, createEventSeriesParticipantsByEventLoader } from '@/graphql/loaders';
import { EventSeriesParticipant as EventParticipantModel } from '@/mongodb/models';
import { EventSeriesParticipantDAO } from '@/mongodb/dao';
import type { EventSeriesParticipant } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  EventSeriesParticipant: {
    find: jest.fn(),
  },
}));
jest.mock('@/mongodb/dao', () => ({
  EventSeriesParticipantDAO: {
    readByEvents: jest.fn(),
  },
}));

describe('EventSeriesParticipantLoader', () => {
  describe('createEventSeriesParticipantLoader', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should batch load participants by ID', async () => {
      const mockParticipants: Array<Partial<EventSeriesParticipant> & { _id: string }> = [
        {
          _id: 'participant1',
          participantId: 'participant1',
          eventId: 'event1',
          userId: 'user1',
        },
        {
          _id: 'participant2',
          participantId: 'participant2',
          eventId: 'event2',
          userId: 'user2',
        },
      ];
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockParticipants),
      };
      (EventParticipantModel.find as jest.Mock).mockReturnValue(mockQuery);
      const loader = createEventSeriesParticipantLoader();
      const results = await Promise.all([
        loader.load('participant1'),
        loader.load('participant2'),
        loader.load('participant3'),
      ]);
      expect(EventParticipantModel.find).toHaveBeenCalledTimes(1);
      expect(EventParticipantModel.find).toHaveBeenCalledWith({
        _id: { $in: ['participant1', 'participant2', 'participant3'] },
      });
      expect(results[0]).toEqual(mockParticipants[0]);
      expect(results[1]).toEqual(mockParticipants[1]);
      expect(results[2]).toBeNull();
    });

    it('should handle empty input', async () => {
      const loader = createEventSeriesParticipantLoader();
      const results = await loader.loadMany([]);
      expect(results).toEqual([]);
    });

    it('should cache results within the same loader instance', async () => {
      const mockParticipant: Partial<EventSeriesParticipant> & { _id: string } = {
        _id: 'participant1',
        participantId: 'participant1',
        eventId: 'event1',
        userId: 'user1',
      };
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockParticipant]),
      };
      (EventParticipantModel.find as jest.Mock).mockReturnValue(mockQuery);
      const loader = createEventSeriesParticipantLoader();
      await loader.load('participant1');
      await loader.load('participant1');
      expect(EventParticipantModel.find).toHaveBeenCalledTimes(1);
    });

    it('should maintain correct order when database returns results in different order', async () => {
      const mockParticipants: Array<Partial<EventSeriesParticipant> & { _id: string }> = [
        { _id: 'participant2', participantId: 'participant2', eventId: 'event2', userId: 'user2' },
        { _id: 'participant1', participantId: 'participant1', eventId: 'event1', userId: 'user1' },
        { _id: 'participant3', participantId: 'participant3', eventId: 'event3', userId: 'user3' },
      ];
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockParticipants),
      };
      (EventParticipantModel.find as jest.Mock).mockReturnValue(mockQuery);
      const loader = createEventSeriesParticipantLoader();
      const results = await Promise.all([
        loader.load('participant1'),
        loader.load('participant2'),
        loader.load('participant3'),
      ]);
      expect((results[0] as Partial<EventSeriesParticipant> & { _id: string })?._id).toBe('participant1');
      expect((results[1] as Partial<EventSeriesParticipant> & { _id: string })?._id).toBe('participant2');
      expect((results[2] as Partial<EventSeriesParticipant> & { _id: string })?._id).toBe('participant3');
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (EventParticipantModel.find as jest.Mock).mockReturnValue(mockQuery);
      const loader = createEventSeriesParticipantLoader();
      await expect(loader.load('participant1')).rejects.toThrow('Database error');
    });
  });

  describe('createEventSeriesParticipantsByEventLoader', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should batch load participants by eventId', async () => {
      const eventIds = ['event1', 'event2', 'event3'];
      const mockParticipants: Array<Partial<EventSeriesParticipant> & { eventId: string }> = [
        { participantId: 'p1', eventId: 'event1', userId: 'user1' },
        { participantId: 'p2', eventId: 'event1', userId: 'user2' },
        { participantId: 'p3', eventId: 'event2', userId: 'user3' },
      ];
      (EventSeriesParticipantDAO.readByEvents as jest.Mock).mockResolvedValue(mockParticipants);
      const loader = createEventSeriesParticipantsByEventLoader();
      const results = await loader.loadMany(eventIds);
      expect(EventSeriesParticipantDAO.readByEvents).toHaveBeenCalledWith(eventIds);
      expect(results[0]).toEqual([
        { participantId: 'p1', eventId: 'event1', userId: 'user1' },
        { participantId: 'p2', eventId: 'event1', userId: 'user2' },
      ]);
      expect(results[1]).toEqual([{ participantId: 'p3', eventId: 'event2', userId: 'user3' }]);
      expect(results[2]).toEqual([]); // event3 has no participants
    });

    it('should handle empty input', async () => {
      const loader = createEventSeriesParticipantsByEventLoader();
      const results = await loader.loadMany([]);
      expect(results).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (EventSeriesParticipantDAO.readByEvents as jest.Mock).mockRejectedValue(new Error('DAO error'));
      const loader = createEventSeriesParticipantsByEventLoader();
      await expect(loader.load('event1')).rejects.toThrow('DAO error');
    });
  });
});
