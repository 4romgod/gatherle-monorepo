import DataLoader from 'dataloader';
import { EventOccurrenceParticipantDAO } from '@/mongodb/dao';
import { EventOccurrenceParticipant as EventOccurrenceParticipantModel } from '@/mongodb/models';
import type { EventOccurrenceParticipant } from '@gatherle/commons/types';
import {
  buildMyEventOccurrenceParticipantLoadKey as buildOccurrenceParticipantLoadKey,
  getActiveOccurrenceRsvpCountContribution,
} from '@/utils';

export { buildMyEventOccurrenceParticipantLoadKey } from '@/utils';

export const createEventOccurrenceParticipantLoader = () =>
  new DataLoader<string, EventOccurrenceParticipant | null>(async (participantIds) => {
    const uniqueParticipantIds = Array.from(new Set(participantIds.map((participantId) => participantId.toString())));
    const participants = await EventOccurrenceParticipantModel.find({ _id: { $in: uniqueParticipantIds } })
      .lean()
      .exec();
    const participantMap = new Map<string, EventOccurrenceParticipant>(
      participants.map((participant) => [participant._id.toString(), participant as EventOccurrenceParticipant]),
    );

    return participantIds.map((participantId) => participantMap.get(participantId.toString()) ?? null);
  });

export const createEventOccurrenceParticipantsByOccurrenceLoader = () =>
  new DataLoader<string, EventOccurrenceParticipant[]>(async (occurrenceIds) => {
    const participants = await EventOccurrenceParticipantDAO.readByOccurrences([...occurrenceIds]);
    const participantMap = new Map<string, EventOccurrenceParticipant[]>();

    for (const occurrenceId of occurrenceIds) {
      participantMap.set(occurrenceId, []);
    }

    for (const participant of participants) {
      participantMap.get(participant.occurrenceId)?.push(participant);
    }

    return occurrenceIds.map((occurrenceId) => participantMap.get(occurrenceId) ?? []);
  });

export const createEventOccurrenceParticipantCountByOccurrenceLoader = () =>
  new DataLoader<string, number>(async (occurrenceIds) => {
    const participants = await EventOccurrenceParticipantDAO.readByOccurrences([...occurrenceIds]);
    const countMap = new Map<string, number>();

    for (const occurrenceId of occurrenceIds) {
      countMap.set(occurrenceId, 0);
    }

    for (const participant of participants) {
      countMap.set(
        participant.occurrenceId,
        (countMap.get(participant.occurrenceId) ?? 0) + getActiveOccurrenceRsvpCountContribution(participant),
      );
    }

    return occurrenceIds.map((occurrenceId) => countMap.get(occurrenceId) ?? 0);
  });

export const createMyEventOccurrenceParticipantLoader = () =>
  new DataLoader<string, EventOccurrenceParticipant | null>(async (keys) => {
    const parsedKeys = keys
      .map((key) => {
        try {
          const [occurrenceId, userId] = JSON.parse(key) as [string, string];
          if (!occurrenceId || !userId) {
            return null;
          }

          return { key, occurrenceId, userId };
        } catch {
          return null;
        }
      })
      .filter((parsed): parsed is { key: string; occurrenceId: string; userId: string } => Boolean(parsed));

    const participantsByUser = new Map<string, EventOccurrenceParticipant>();
    const occurrenceIdsByUser = new Map<string, string[]>();

    for (const { occurrenceId, userId } of parsedKeys) {
      const existingOccurrenceIds = occurrenceIdsByUser.get(userId) ?? [];
      if (!existingOccurrenceIds.includes(occurrenceId)) {
        occurrenceIdsByUser.set(userId, [...existingOccurrenceIds, occurrenceId]);
      }
    }

    await Promise.all(
      Array.from(occurrenceIdsByUser.entries()).map(async ([userId, occurrenceIds]) => {
        const participants = await EventOccurrenceParticipantDAO.readByOccurrencesAndUser(occurrenceIds, userId);
        for (const participant of participants) {
          participantsByUser.set(
            buildOccurrenceParticipantLoadKey(participant.occurrenceId, participant.userId),
            participant,
          );
        }
      }),
    );

    return keys.map((key) => participantsByUser.get(key) ?? null);
  });
