import {
  buildMyEventOccurrenceParticipantLoadKey,
  createEventOccurrenceParticipantCountByOccurrenceLoader,
  createMyEventOccurrenceParticipantLoader,
} from '@/graphql/loaders/eventOccurrenceParticipantLoader';
import { EventOccurrenceParticipantDAO } from '@/mongodb/dao';
import { ParticipantStatus, type EventOccurrenceParticipant } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceParticipantDAO: {
    readByOccurrences: jest.fn(),
    readByOccurrencesAndUser: jest.fn(),
  },
}));

describe('EventOccurrenceParticipantLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMyEventOccurrenceParticipantLoader', () => {
    it('returns the participant for the matching occurrence and user key', async () => {
      const participant: EventOccurrenceParticipant = {
        participantId: 'participant-1',
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        userId: 'user-1',
        status: ParticipantStatus.Going,
        quantity: 1,
        rsvpAt: new Date('2026-05-01T12:00:00.000Z'),
      };
      (EventOccurrenceParticipantDAO.readByOccurrencesAndUser as jest.Mock).mockResolvedValue([participant]);

      const loader = createMyEventOccurrenceParticipantLoader();
      const result = await loader.load(
        buildMyEventOccurrenceParticipantLoadKey(participant.occurrenceId, participant.userId),
      );

      expect(EventOccurrenceParticipantDAO.readByOccurrencesAndUser).toHaveBeenCalledWith(
        [participant.occurrenceId],
        participant.userId,
      );
      expect(result).toEqual(participant);
    });

    it('queries only the occurrence IDs relevant to each user in the batch', async () => {
      (EventOccurrenceParticipantDAO.readByOccurrencesAndUser as jest.Mock).mockImplementation(
        async (occurrenceIds: string[], userId: string) =>
          occurrenceIds.map(
            (occurrenceId) =>
              ({
                participantId: `${userId}-${occurrenceId}`,
                occurrenceId,
                userId,
                status: ParticipantStatus.Going,
              }) as EventOccurrenceParticipant,
          ),
      );

      const loader = createMyEventOccurrenceParticipantLoader();
      await loader.loadMany([
        buildMyEventOccurrenceParticipantLoadKey('series-1#2026-05-06T16:00:00.000Z', 'user-1'),
        buildMyEventOccurrenceParticipantLoadKey('series-1#2026-05-13T16:00:00.000Z', 'user-1'),
        buildMyEventOccurrenceParticipantLoadKey('series-2#2026-05-07T10:00:00.000Z', 'user-2'),
      ]);

      expect(EventOccurrenceParticipantDAO.readByOccurrencesAndUser).toHaveBeenCalledTimes(2);
      expect(EventOccurrenceParticipantDAO.readByOccurrencesAndUser).toHaveBeenNthCalledWith(
        1,
        ['series-1#2026-05-06T16:00:00.000Z', 'series-1#2026-05-13T16:00:00.000Z'],
        'user-1',
      );
      expect(EventOccurrenceParticipantDAO.readByOccurrencesAndUser).toHaveBeenNthCalledWith(
        2,
        ['series-2#2026-05-07T10:00:00.000Z'],
        'user-2',
      );
    });
  });

  describe('createEventOccurrenceParticipantCountByOccurrenceLoader', () => {
    it('includes CheckedIn participants and sums quantity for active RSVP count', async () => {
      (EventOccurrenceParticipantDAO.readByOccurrences as jest.Mock).mockResolvedValue([
        {
          participantId: 'participant-1',
          occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
          userId: 'user-1',
          status: ParticipantStatus.Going,
          quantity: 2,
        },
        {
          participantId: 'participant-2',
          occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
          userId: 'user-2',
          status: ParticipantStatus.CheckedIn,
          quantity: 1,
        },
        {
          participantId: 'participant-3',
          occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
          userId: 'user-3',
          status: ParticipantStatus.Cancelled,
          quantity: 5,
        },
      ] as EventOccurrenceParticipant[]);

      const loader = createEventOccurrenceParticipantCountByOccurrenceLoader();
      const result = await loader.load('series-1#2026-05-06T16:00:00.000Z');

      expect(result).toBe(3);
    });
  });
});
