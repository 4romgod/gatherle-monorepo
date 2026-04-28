import { GraphQLError } from 'graphql';
import { EventOccurrenceParticipantDAO } from '@/mongodb/dao';
import { EventOccurrenceParticipant as EventOccurrenceParticipantModel } from '@/mongodb/models';
import { ParticipantStatus, ParticipantVisibility, type EventOccurrenceParticipant } from '@gatherle/commons/types';
import { createMockSuccessMongooseQuery, createMockFailedMongooseQuery, type MockQueryOptions } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EventOccurrenceParticipant: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const FIND_CHAIN_METHODS: MockQueryOptions = { chainMethods: ['sort'] };

describe('EventOccurrenceParticipantDAO', () => {
  const participant: EventOccurrenceParticipant = {
    participantId: 'participant-1',
    occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    invitedBy: 'user-2',
    sharedVisibility: ParticipantVisibility.Followers,
    rsvpAt: new Date('2026-05-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('creates a new occurrence participant when none exists', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventOccurrenceParticipantModel.create as jest.Mock).mockResolvedValue({
        toObject: () => participant,
      });

      const result = await EventOccurrenceParticipantDAO.upsert({
        occurrenceId: participant.occurrenceId,
        userId: participant.userId,
        status: ParticipantStatus.Going,
        quantity: 1,
        invitedBy: participant.invitedBy,
        sharedVisibility: participant.sharedVisibility,
      });

      expect(EventOccurrenceParticipantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          occurrenceId: participant.occurrenceId,
          userId: participant.userId,
          status: ParticipantStatus.Going,
          quantity: 1,
        }),
      );
      expect(result).toEqual(participant);
    });

    it('updates an existing occurrence participant when one already exists', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...participant,
          save,
          toObject: () => ({ ...participant, status: ParticipantStatus.Interested }),
        }),
      );

      const result = await EventOccurrenceParticipantDAO.upsert({
        occurrenceId: participant.occurrenceId,
        userId: participant.userId,
        status: ParticipantStatus.Interested,
      });

      expect(save).toHaveBeenCalled();
      expect(result.status).toBe(ParticipantStatus.Interested);
    });

    it('reactivates a cancelled participant and refreshes rsvpAt', async () => {
      const existingCancelled = {
        ...participant,
        status: ParticipantStatus.Cancelled,
        cancelledAt: new Date('2026-05-02T00:00:00.000Z'),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...participant, status: ParticipantStatus.Going }),
      };
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(existingCancelled),
      );

      await EventOccurrenceParticipantDAO.upsert({
        occurrenceId: participant.occurrenceId,
        userId: participant.userId,
        status: ParticipantStatus.Going,
      });

      expect(existingCancelled.cancelledAt).toBeUndefined();
      expect(existingCancelled.rsvpAt).toBeInstanceOf(Date);
      expect(existingCancelled.save).toHaveBeenCalled();
    });

    it('sets checkedInAt when transitioning an existing participant to CheckedIn', async () => {
      const existingGoing = {
        ...participant,
        checkedInAt: undefined,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...participant, status: ParticipantStatus.CheckedIn, checkedInAt: new Date() }),
      };
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(existingGoing),
      );

      await EventOccurrenceParticipantDAO.upsert({
        occurrenceId: participant.occurrenceId,
        userId: participant.userId,
        status: ParticipantStatus.CheckedIn,
      });

      expect(existingGoing.checkedInAt).toBeInstanceOf(Date);
      expect(existingGoing.save).toHaveBeenCalled();
    });

    it('sets checkedInAt for newly created checked-in participants', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventOccurrenceParticipantModel.create as jest.Mock).mockResolvedValue({
        toObject: () => ({
          ...participant,
          status: ParticipantStatus.CheckedIn,
          checkedInAt: new Date('2026-05-01T00:00:00.000Z'),
        }),
      });

      await EventOccurrenceParticipantDAO.upsert({
        occurrenceId: participant.occurrenceId,
        userId: participant.userId,
        status: ParticipantStatus.CheckedIn,
      });

      expect(EventOccurrenceParticipantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ParticipantStatus.CheckedIn,
          checkedInAt: expect.any(Date),
        }),
      );
    });

    it('wraps upsert failures', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventOccurrenceParticipantModel.create as jest.Mock).mockRejectedValue(new Error('create failed'));

      await expect(
        EventOccurrenceParticipantDAO.upsert({
          occurrenceId: participant.occurrenceId,
          userId: participant.userId,
          status: ParticipantStatus.Going,
        }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('cancel', () => {
    it('marks the participant as cancelled', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...participant,
          save,
          toObject: () => ({ ...participant, status: ParticipantStatus.Cancelled }),
        }),
      );

      const result = await EventOccurrenceParticipantDAO.cancel(participant.occurrenceId, participant.userId);

      expect(save).toHaveBeenCalled();
      expect(result.status).toBe(ParticipantStatus.Cancelled);
    });

    it('throws not found when there is no participant to cancel', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventOccurrenceParticipantDAO.cancel(participant.occurrenceId, participant.userId)).rejects.toThrow(
        `Participant not found for occurrence ${participant.occurrenceId}`,
      );
    });

    it('wraps lookup failures while preparing a cancellation', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('lookup failed')),
      );

      await expect(EventOccurrenceParticipantDAO.cancel(participant.occurrenceId, participant.userId)).rejects.toThrow(
        GraphQLError,
      );
    });

    it('wraps save failures while cancelling', async () => {
      const existing = {
        ...participant,
        save: jest.fn().mockRejectedValue(new Error('save failed')),
        toObject: () => ({ ...participant, status: ParticipantStatus.Cancelled }),
      };
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(existing));

      await expect(EventOccurrenceParticipantDAO.cancel(participant.occurrenceId, participant.userId)).rejects.toThrow(
        GraphQLError,
      );
    });
  });

  describe('cancelAllByOccurrence', () => {
    it('marks all non-cancelled participants for the occurrence as cancelled', async () => {
      (EventOccurrenceParticipantModel.updateMany as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ acknowledged: true }),
      );

      await EventOccurrenceParticipantDAO.cancelAllByOccurrence(participant.occurrenceId);

      expect(EventOccurrenceParticipantModel.updateMany).toHaveBeenCalledWith(
        {
          occurrenceId: participant.occurrenceId,
          status: { $ne: ParticipantStatus.Cancelled },
        },
        {
          $set: {
            status: ParticipantStatus.Cancelled,
            cancelledAt: expect.any(Date),
          },
        },
      );
    });

    it('wraps bulk cancellation failures', async () => {
      (EventOccurrenceParticipantModel.updateMany as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('cancel failed')),
      );

      await expect(EventOccurrenceParticipantDAO.cancelAllByOccurrence(participant.occurrenceId)).rejects.toThrow(
        GraphQLError,
      );
    });
  });

  describe('readByOccurrence', () => {
    it('reads participants for one occurrence', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ toObject: () => participant }], FIND_CHAIN_METHODS),
      );

      const result = await EventOccurrenceParticipantDAO.readByOccurrence(participant.occurrenceId);

      expect(EventOccurrenceParticipantModel.find).toHaveBeenCalledWith({ occurrenceId: participant.occurrenceId });
      expect(result).toEqual([participant]);
    });

    it('wraps readByOccurrence failures', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), FIND_CHAIN_METHODS),
      );

      await expect(EventOccurrenceParticipantDAO.readByOccurrence(participant.occurrenceId)).rejects.toThrow(
        GraphQLError,
      );
    });
  });

  describe('readByOccurrences', () => {
    it('reads participants for multiple occurrence IDs', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ toObject: () => participant }], FIND_CHAIN_METHODS),
      );

      const result = await EventOccurrenceParticipantDAO.readByOccurrences([participant.occurrenceId]);

      expect(EventOccurrenceParticipantModel.find).toHaveBeenCalledWith({
        occurrenceId: { $in: [participant.occurrenceId] },
      });
      expect(result).toEqual([participant]);
    });

    it('wraps read failures', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), FIND_CHAIN_METHODS),
      );

      await expect(EventOccurrenceParticipantDAO.readByOccurrences([participant.occurrenceId])).rejects.toThrow(
        GraphQLError,
      );
    });

    it('returns early when no occurrence IDs are provided', async () => {
      const result = await EventOccurrenceParticipantDAO.readByOccurrences([]);

      expect(result).toEqual([]);
      expect(EventOccurrenceParticipantModel.find).not.toHaveBeenCalled();
    });
  });

  describe('readByOccurrenceAndUser', () => {
    it('returns null when no participant exists for the occurrence and user', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(
        participant.occurrenceId,
        participant.userId,
      );

      expect(result).toBeNull();
    });

    it('wraps readByOccurrenceAndUser failures', async () => {
      (EventOccurrenceParticipantModel.findOne as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed')),
      );

      await expect(
        EventOccurrenceParticipantDAO.readByOccurrenceAndUser(participant.occurrenceId, participant.userId),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('readByOccurrencesAndUser', () => {
    it('filters by occurrence IDs and user', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ toObject: () => participant }]),
      );

      const result = await EventOccurrenceParticipantDAO.readByOccurrencesAndUser(
        [participant.occurrenceId],
        participant.userId,
      );

      expect(EventOccurrenceParticipantModel.find).toHaveBeenCalledWith({
        occurrenceId: { $in: [participant.occurrenceId] },
        userId: participant.userId,
      });
      expect(result).toEqual([participant]);
    });

    it('returns early when occurrence IDs are empty', async () => {
      const result = await EventOccurrenceParticipantDAO.readByOccurrencesAndUser([], participant.userId);

      expect(result).toEqual([]);
      expect(EventOccurrenceParticipantModel.find).not.toHaveBeenCalled();
    });

    it('wraps readByOccurrencesAndUser failures', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed')),
      );

      await expect(
        EventOccurrenceParticipantDAO.readByOccurrencesAndUser([participant.occurrenceId], participant.userId),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('readWaitlistedByOccurrence', () => {
    it('reads waitlisted participants for an occurrence', async () => {
      const waitlistedParticipant = { ...participant, status: ParticipantStatus.Waitlisted };
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ toObject: () => waitlistedParticipant }], FIND_CHAIN_METHODS),
      );

      const result = await EventOccurrenceParticipantDAO.readWaitlistedByOccurrence(participant.occurrenceId);

      expect(EventOccurrenceParticipantModel.find).toHaveBeenCalledWith({
        occurrenceId: participant.occurrenceId,
        status: 'Waitlisted',
      });
      expect(result).toEqual([waitlistedParticipant]);
    });

    it('wraps readWaitlistedByOccurrence failures', async () => {
      (EventOccurrenceParticipantModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), FIND_CHAIN_METHODS),
      );

      await expect(EventOccurrenceParticipantDAO.readWaitlistedByOccurrence(participant.occurrenceId)).rejects.toThrow(
        GraphQLError,
      );
    });
  });

  describe('promoteWaitlisted', () => {
    it('promotes a waitlisted participant atomically when still waitlisted', async () => {
      (EventOccurrenceParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => ({ ...participant, status: ParticipantStatus.Going }),
        }),
      );

      const result = await EventOccurrenceParticipantDAO.promoteWaitlisted(
        participant.occurrenceId,
        participant.userId,
      );

      expect(EventOccurrenceParticipantModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          occurrenceId: participant.occurrenceId,
          userId: participant.userId,
          status: ParticipantStatus.Waitlisted,
        },
        {
          $set: { status: ParticipantStatus.Going },
          $unset: { cancelledAt: 1 },
        },
        { new: true },
      );
      expect(result?.status).toBe(ParticipantStatus.Going);
    });

    it('returns null when the participant is no longer waitlisted', async () => {
      (EventOccurrenceParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(null),
      );

      const result = await EventOccurrenceParticipantDAO.promoteWaitlisted(
        participant.occurrenceId,
        participant.userId,
      );

      expect(result).toBeNull();
    });

    it('wraps promotion failures', async () => {
      (EventOccurrenceParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('promote failed')),
      );

      await expect(
        EventOccurrenceParticipantDAO.promoteWaitlisted(participant.occurrenceId, participant.userId),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('reassignOccurrenceIds', () => {
    it('returns early when there are no mappings', async () => {
      await EventOccurrenceParticipantDAO.reassignOccurrenceIds([]);

      expect(EventOccurrenceParticipantModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('bulk updates participant occurrence references', async () => {
      (EventOccurrenceParticipantModel.bulkWrite as jest.Mock).mockResolvedValue(undefined);

      await EventOccurrenceParticipantDAO.reassignOccurrenceIds([
        {
          oldOccurrenceId: participant.occurrenceId,
          newOccurrenceId: 'series-2#2026-05-06T16:00:00.000Z',
        },
      ]);

      expect(EventOccurrenceParticipantModel.bulkWrite).toHaveBeenCalledWith(
        [
          {
            updateMany: {
              filter: { occurrenceId: participant.occurrenceId },
              update: {
                $set: { occurrenceId: 'series-2#2026-05-06T16:00:00.000Z' },
              },
            },
          },
        ],
        { ordered: true },
      );
    });

    it('wraps bulk update failures when reassigning participant occurrence references', async () => {
      (EventOccurrenceParticipantModel.bulkWrite as jest.Mock).mockRejectedValue(new Error('bulk write failed'));

      await expect(
        EventOccurrenceParticipantDAO.reassignOccurrenceIds([
          {
            oldOccurrenceId: participant.occurrenceId,
            newOccurrenceId: 'series-2#2026-05-06T16:00:00.000Z',
          },
        ]),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('deleteByOccurrenceIds', () => {
    it('returns early when there are no occurrence IDs', async () => {
      await EventOccurrenceParticipantDAO.deleteByOccurrenceIds([]);

      expect(EventOccurrenceParticipantModel.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes participant rows for a set of occurrence IDs', async () => {
      (EventOccurrenceParticipantModel.deleteMany as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ deletedCount: 1 }),
      );

      await EventOccurrenceParticipantDAO.deleteByOccurrenceIds([participant.occurrenceId]);

      expect(EventOccurrenceParticipantModel.deleteMany).toHaveBeenCalledWith({
        occurrenceId: { $in: [participant.occurrenceId] },
      });
    });

    it('wraps delete failures when removing participant rows by occurrence IDs', async () => {
      (EventOccurrenceParticipantModel.deleteMany as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('delete failed')),
      );

      await expect(EventOccurrenceParticipantDAO.deleteByOccurrenceIds([participant.occurrenceId])).rejects.toThrow(
        GraphQLError,
      );
    });
  });
});
