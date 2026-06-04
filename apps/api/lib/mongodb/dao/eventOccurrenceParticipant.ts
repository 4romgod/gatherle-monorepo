import type {
  EventOccurrenceParticipant,
  ParticipantVisibility,
  QueryOptionsInput,
  UpsertEventOccurrenceParticipantInput,
} from '@gatherle/commons/server/types';
import { FilterOperatorInput, ParticipantStatus, SortOrderInput } from '@gatherle/commons/server/types';
import { EventOccurrenceParticipant as EventOccurrenceParticipantModel } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError, transformOptionsToQuery } from '@/utils';
import type { PipelineStage } from 'mongoose';

type UpsertOccurrenceParticipantPayload = UpsertEventOccurrenceParticipantInput & {
  userId: string;
  status: ParticipantStatus;
};

class EventOccurrenceParticipantDAO {
  static async readActiveCountsByOccurrences(occurrenceIds: string[]): Promise<Map<string, number>> {
    if (occurrenceIds.length === 0) {
      return new Map();
    }

    try {
      const rows = await EventOccurrenceParticipantModel.aggregate<{ _id: string; rsvpCount: number }>([
        {
          $match: {
            occurrenceId: { $in: occurrenceIds },
            status: {
              $in: [ParticipantStatus.Going, ParticipantStatus.Interested, ParticipantStatus.CheckedIn],
            },
          },
        },
        {
          $project: {
            occurrenceId: 1,
            rsvpContribution: {
              $cond: [
                {
                  $and: [{ $ne: ['$quantity', null] }, { $gt: ['$quantity', 1] }],
                },
                '$quantity',
                1,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$occurrenceId',
            rsvpCount: { $sum: '$rsvpContribution' },
          },
        },
      ]).exec();

      return new Map(rows.map((row) => [row._id, row.rsvpCount]));
    } catch (error) {
      logDaoError('Error reading active RSVP counts by occurrence IDs', { error, occurrenceIds });
      throw KnownCommonError(error);
    }
  }

  static async upsert(input: UpsertOccurrenceParticipantPayload): Promise<EventOccurrenceParticipant> {
    try {
      const { occurrenceId, userId, status, quantity, invitedBy, sharedVisibility } = input;

      let participant = await EventOccurrenceParticipantModel.findOne({ occurrenceId, userId }).exec();

      if (participant) {
        const wasCancelled = participant.status === ParticipantStatus.Cancelled;
        participant.status = status;
        if (quantity !== undefined) participant.quantity = quantity;
        if (invitedBy !== undefined) participant.invitedBy = invitedBy;
        if (sharedVisibility !== undefined) participant.sharedVisibility = sharedVisibility as ParticipantVisibility;
        if (status !== ParticipantStatus.Cancelled) {
          participant.cancelledAt = undefined;
          if (wasCancelled) {
            participant.rsvpAt = new Date();
          }
        }
        if (status === ParticipantStatus.CheckedIn && !participant.checkedInAt) {
          participant.checkedInAt = new Date();
        }
        await participant.save();
      } else {
        participant = await EventOccurrenceParticipantModel.create({
          occurrenceId,
          userId,
          status,
          quantity,
          invitedBy,
          sharedVisibility,
          rsvpAt: new Date(),
          checkedInAt: status === ParticipantStatus.CheckedIn ? new Date() : undefined,
        });
      }

      return participant.toObject();
    } catch (error) {
      logDaoError('Error upserting event occurrence participant', { error });
      throw KnownCommonError(error);
    }
  }

  static async cancel(occurrenceId: string, userId: string): Promise<EventOccurrenceParticipant> {
    let participant;
    try {
      participant = await EventOccurrenceParticipantModel.findOne({ occurrenceId, userId }).exec();
    } catch (error) {
      logDaoError('Error finding event occurrence participant for cancellation', { error });
      throw KnownCommonError(error);
    }

    if (!participant) {
      throw CustomError(`Participant not found for occurrence ${occurrenceId}`, ErrorTypes.NOT_FOUND);
    }

    try {
      participant.status = ParticipantStatus.Cancelled;
      participant.cancelledAt = new Date();
      await participant.save();
      return participant.toObject();
    } catch (error) {
      logDaoError('Error cancelling event occurrence participant', { error });
      throw KnownCommonError(error);
    }
  }

  static async cancelAllByOccurrence(occurrenceId: string): Promise<void> {
    try {
      await EventOccurrenceParticipantModel.updateMany(
        {
          occurrenceId,
          status: { $ne: ParticipantStatus.Cancelled },
        },
        {
          $set: {
            status: ParticipantStatus.Cancelled,
            cancelledAt: new Date(),
          },
        },
      ).exec();
    } catch (error) {
      logDaoError('Error cancelling all occurrence participants', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }

  static async readByOccurrence(occurrenceId: string): Promise<EventOccurrenceParticipant[]> {
    try {
      const participants = await EventOccurrenceParticipantModel.find({ occurrenceId }).sort({ rsvpAt: 1 }).exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading occurrence participants', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }

  static async readByOccurrences(occurrenceIds: string[]): Promise<EventOccurrenceParticipant[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    try {
      const participants = await EventOccurrenceParticipantModel.find({
        occurrenceId: { $in: occurrenceIds },
      })
        .sort({ occurrenceId: 1, rsvpAt: 1 })
        .exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading occurrence participants by occurrence IDs', { error, occurrenceIds });
      throw KnownCommonError(error);
    }
  }

  static async readByOccurrenceAndUser(
    occurrenceId: string,
    userId: string,
  ): Promise<EventOccurrenceParticipant | null> {
    try {
      const participant = await EventOccurrenceParticipantModel.findOne({ occurrenceId, userId }).exec();
      return participant ? participant.toObject() : null;
    } catch (error) {
      logDaoError('Error reading occurrence participant by occurrence and user', { error, occurrenceId, userId });
      throw KnownCommonError(error);
    }
  }

  static async readByOccurrencesAndUser(
    occurrenceIds: string[],
    userId: string,
  ): Promise<EventOccurrenceParticipant[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    try {
      const participants = await EventOccurrenceParticipantModel.find({
        occurrenceId: { $in: occurrenceIds },
        userId,
      }).exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading occurrence participants by occurrence IDs and user', {
        error,
        occurrenceIds,
        userId,
      });
      throw KnownCommonError(error);
    }
  }

  static async hasParticipantForEventSeries(eventSeriesId: string, userId: string): Promise<boolean> {
    try {
      const participants = await EventOccurrenceParticipantModel.aggregate([
        {
          $match: {
            userId,
          },
        },
        {
          $lookup: {
            from: 'eventoccurrences',
            localField: 'occurrenceId',
            foreignField: 'occurrenceId',
            as: 'occurrence',
          },
        },
        {
          $match: {
            'occurrence.eventSeriesId': eventSeriesId,
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ]).exec();

      return participants.length > 0;
    } catch (error) {
      logDaoError('Error checking occurrence participant membership by event series', {
        error,
        eventSeriesId,
        userId,
      });
      throw KnownCommonError(error);
    }
  }

  static async readByUser(
    userId: string,
    activeOnly = true,
    options?: QueryOptionsInput,
  ): Promise<EventOccurrenceParticipant[]> {
    try {
      const participants = await transformOptionsToQuery(EventOccurrenceParticipantModel, {
        ...options,
        filters: [
          { field: 'userId', value: userId },
          ...(activeOnly
            ? [{ field: 'status', operator: FilterOperatorInput.ne, value: ParticipantStatus.Cancelled }]
            : []),
          ...(options?.filters ?? []),
        ],
        sort: options?.sort?.length
          ? options.sort
          : [
              { field: 'rsvpAt', order: SortOrderInput.desc },
              { field: 'createdAt', order: SortOrderInput.desc },
            ],
      }).exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading occurrence participants by user', { error, userId, activeOnly });
      throw KnownCommonError(error);
    }
  }

  static async readOccurrenceIdsByUser(
    userId: string,
    activeOnly = true,
    startAtOrder: 1 | -1 = -1,
    skip = 0,
    limit?: number,
  ): Promise<string[]> {
    try {
      const pipeline: PipelineStage[] = [
        {
          $match: {
            userId,
            ...(activeOnly ? { status: { $ne: ParticipantStatus.Cancelled } } : {}),
          },
        },
        {
          $lookup: {
            from: 'eventoccurrences',
            localField: 'occurrenceId',
            foreignField: 'occurrenceId',
            as: 'occurrence',
          },
        },
        {
          $unwind: '$occurrence',
        },
        {
          $sort: {
            'occurrence.startAt': startAtOrder,
            occurrenceId: 1,
          },
        },
      ];

      if (skip > 0) {
        pipeline.push({ $skip: skip });
      }

      if (typeof limit === 'number') {
        pipeline.push({ $limit: limit });
      }

      pipeline.push({
        $project: {
          _id: 0,
          occurrenceId: '$occurrenceId',
        },
      });

      const rows = await EventOccurrenceParticipantModel.aggregate<{ occurrenceId: string }>(pipeline).exec();
      return rows.map((row) => row.occurrenceId);
    } catch (error) {
      logDaoError('Error reading ordered occurrence IDs by user', {
        error,
        userId,
        activeOnly,
        startAtOrder,
        skip,
        limit,
      });
      throw KnownCommonError(error);
    }
  }

  static async readByUserIds(userIds: string[], activeOnly = true): Promise<EventOccurrenceParticipant[]> {
    if (userIds.length === 0) {
      return [];
    }

    try {
      const query: Record<string, unknown> = { userId: { $in: userIds } };
      if (activeOnly) {
        query.status = { $ne: ParticipantStatus.Cancelled };
      }

      const participants = await EventOccurrenceParticipantModel.find(query)
        .sort({ userId: 1, occurrenceId: 1, rsvpAt: 1 })
        .exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading occurrence participants by userIds', { error, userIds, activeOnly });
      throw KnownCommonError(error);
    }
  }

  static async readWaitlistedByOccurrence(occurrenceId: string): Promise<EventOccurrenceParticipant[]> {
    try {
      const participants = await EventOccurrenceParticipantModel.find({
        occurrenceId,
        status: ParticipantStatus.Waitlisted,
      })
        .sort({ rsvpAt: 1, createdAt: 1 })
        .exec();
      return participants.map((participant) => participant.toObject());
    } catch (error) {
      logDaoError('Error reading waitlisted occurrence participants', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }

  static async promoteWaitlisted(occurrenceId: string, userId: string): Promise<EventOccurrenceParticipant | null> {
    try {
      const participant = await EventOccurrenceParticipantModel.findOneAndUpdate(
        {
          occurrenceId,
          userId,
          status: ParticipantStatus.Waitlisted,
        },
        {
          $set: { status: ParticipantStatus.Going },
          $unset: { cancelledAt: 1 },
        },
        {
          new: true,
        },
      ).exec();

      return participant ? participant.toObject() : null;
    } catch (error) {
      logDaoError('Error promoting waitlisted occurrence participant', { error, occurrenceId, userId });
      throw KnownCommonError(error);
    }
  }

  static async reassignOccurrenceIds(
    mappings: Array<{ oldOccurrenceId: string; newOccurrenceId: string }>,
  ): Promise<void> {
    if (mappings.length === 0) {
      return;
    }

    try {
      await EventOccurrenceParticipantModel.bulkWrite(
        mappings.map((mapping) => ({
          updateMany: {
            filter: { occurrenceId: mapping.oldOccurrenceId },
            update: {
              $set: { occurrenceId: mapping.newOccurrenceId },
            },
          },
        })),
        { ordered: true },
      );
    } catch (error) {
      logDaoError('Error reassigning occurrence participant IDs', { error, count: mappings.length });
      throw KnownCommonError(error);
    }
  }

  static async deleteByOccurrenceIds(occurrenceIds: string[]): Promise<void> {
    if (occurrenceIds.length === 0) {
      return;
    }

    try {
      await EventOccurrenceParticipantModel.deleteMany({ occurrenceId: { $in: occurrenceIds } }).exec();
    } catch (error) {
      logDaoError('Error deleting occurrence participants by occurrenceIds', { error, occurrenceIds });
      throw KnownCommonError(error);
    }
  }

  static async deleteByUserId(userId: string): Promise<void> {
    try {
      await EventOccurrenceParticipantModel.deleteMany({ userId }).exec();
    } catch (error) {
      logDaoError('Error deleting occurrence participants by userId', { error, userId });
      throw KnownCommonError(error);
    }
  }
}

export default EventOccurrenceParticipantDAO;
