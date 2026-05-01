import type {
  CancelEventParticipantInput,
  EventOccurrence,
  EventOccurrenceParticipant,
  EventSeries,
  EventSeriesParticipant,
  UpsertEventParticipantInput,
} from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import {
  CustomError,
  ErrorTypes,
  isOccurrenceUpcoming,
  projectOccurrenceParticipantToSeriesParticipant,
  sumActiveOccurrenceRsvpCount,
} from '@/utils';
import EventOccurrenceParticipantService from './eventOccurrenceParticipant';
import EventOccurrenceService from './eventOccurrence';

class EventSeriesParticipantService {
  private static async loadRepresentativeOccurrenceContext(
    eventId: string,
  ): Promise<{ eventSeries: EventSeries; occurrence: EventOccurrence }> {
    const eventSeries = await EventSeriesDAO.readEventById(eventId);
    const occurrence = await EventOccurrenceService.readRepresentativeOccurrenceForSeries(eventId);
    if (!occurrence) {
      throw CustomError(`Representative occurrence not found for event series ${eventId}`, ErrorTypes.NOT_FOUND);
    }

    return { eventSeries, occurrence };
  }

  private static chooseRepresentativeParticipant<
    T extends {
      participantId: string;
      occurrenceId: string;
      status: string;
    },
  >(participants: T[], occurrencesById: Map<string, EventOccurrence>, now: Date): T | null {
    if (participants.length === 0) {
      return null;
    }

    const participantPriority = (participant: T) => {
      const occurrence = occurrencesById.get(participant.occurrenceId);
      if (!occurrence) {
        return [4, Number.MAX_SAFE_INTEGER] as const;
      }

      const upcoming = isOccurrenceUpcoming(occurrence, now);
      const cancelled = participant.status === ParticipantStatus.Cancelled;
      if (!cancelled && upcoming) {
        return [0, occurrence.startAt.getTime()] as const;
      }

      if (!cancelled) {
        return [1, -occurrence.startAt.getTime()] as const;
      }

      return upcoming ? ([2, occurrence.startAt.getTime()] as const) : ([3, -occurrence.startAt.getTime()] as const);
    };

    return [...participants].sort((left, right) => {
      const [leftBucket, leftValue] = participantPriority(left);
      const [rightBucket, rightValue] = participantPriority(right);
      if (leftBucket !== rightBucket) {
        return leftBucket - rightBucket;
      }
      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }
      return left.participantId.localeCompare(right.participantId);
    })[0];
  }

  private static toSeriesParticipant(
    eventId: string,
    participant: Parameters<typeof projectOccurrenceParticipantToSeriesParticipant>[1],
    eventSeries?: EventSeries,
  ): EventSeriesParticipant {
    return projectOccurrenceParticipantToSeriesParticipant(eventId, participant, eventSeries);
  }

  static async rsvp(input: UpsertEventParticipantInput): Promise<EventSeriesParticipant> {
    const { eventSeries, occurrence } = await this.loadRepresentativeOccurrenceContext(input.eventId);
    const participant = await EventOccurrenceParticipantService.rsvp(
      {
        occurrenceId: occurrence.occurrenceId,
        status: input.status,
        quantity: input.quantity,
        invitedBy: input.invitedBy,
        sharedVisibility: input.sharedVisibility,
      },
      input.userId,
    );

    return this.toSeriesParticipant(eventSeries.eventId, participant, eventSeries);
  }

  static async cancel(input: CancelEventParticipantInput): Promise<EventSeriesParticipant> {
    const { eventSeries, occurrence } = await this.loadRepresentativeOccurrenceContext(input.eventId);
    const participant = await EventOccurrenceParticipantService.cancel(occurrence.occurrenceId, input.userId);
    return this.toSeriesParticipant(eventSeries.eventId, participant, eventSeries);
  }

  static async checkIn(eventId: string, userId: string): Promise<EventSeriesParticipant> {
    const { eventSeries, occurrence } = await this.loadRepresentativeOccurrenceContext(eventId);
    const participant = await EventOccurrenceParticipantService.checkIn(occurrence.occurrenceId, userId);
    return this.toSeriesParticipant(eventSeries.eventId, participant, eventSeries);
  }

  static async readByEvent(eventId: string): Promise<EventSeriesParticipant[]> {
    const { eventSeries, occurrence } = await this.loadRepresentativeOccurrenceContext(eventId);
    const participants = await EventOccurrenceParticipantDAO.readByOccurrence(occurrence.occurrenceId);
    return participants.map((participant) => this.toSeriesParticipant(eventSeries.eventId, participant, eventSeries));
  }

  static async readByEventAndUser(eventId: string, userId: string): Promise<EventSeriesParticipant | null> {
    const { eventSeries, occurrence } = await this.loadRepresentativeOccurrenceContext(eventId);
    const participant = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(occurrence.occurrenceId, userId);
    return participant ? this.toSeriesParticipant(eventSeries.eventId, participant, eventSeries) : null;
  }

  static async readByUser(userId: string, activeOnly = true): Promise<EventSeriesParticipant[]> {
    const now = new Date();
    const occurrenceParticipants = await EventOccurrenceParticipantDAO.readByUser(userId, activeOnly);
    if (occurrenceParticipants.length === 0) {
      return [];
    }

    const occurrences = await EventOccurrenceDAO.readByOccurrenceIds(
      occurrenceParticipants.map((participant) => participant.occurrenceId),
    );
    if (occurrences.length === 0) {
      return [];
    }

    const occurrencesById = new Map(occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]));
    const uniqueEventSeriesIds = [...new Set(occurrences.map((occurrence) => occurrence.eventSeriesId))];
    const eventSeriesList = await Promise.all(
      uniqueEventSeriesIds.map(async (eventSeriesId) => EventSeriesDAO.readEventById(eventSeriesId)),
    );
    const eventSeriesById = new Map(eventSeriesList.map((eventSeries) => [eventSeries.eventId, eventSeries]));
    const participantsByEventSeriesId = new Map<string, EventOccurrenceParticipant[]>();

    for (const participant of occurrenceParticipants) {
      const occurrence = occurrencesById.get(participant.occurrenceId);
      if (!occurrence) {
        continue;
      }

      const seriesParticipants = participantsByEventSeriesId.get(occurrence.eventSeriesId) ?? [];
      seriesParticipants.push(participant);
      participantsByEventSeriesId.set(occurrence.eventSeriesId, seriesParticipants);
    }

    const representativeParticipants = [...participantsByEventSeriesId.entries()]
      .map(([eventSeriesId, participants]) => {
        const eventSeries = eventSeriesById.get(eventSeriesId);
        if (!eventSeries) {
          return null;
        }

        const participant = this.chooseRepresentativeParticipant(participants, occurrencesById, now);
        if (!participant) {
          return null;
        }

        const occurrence = occurrencesById.get(participant.occurrenceId);
        if (!occurrence) {
          return null;
        }

        return { eventSeries, occurrence, participant };
      })
      .filter(
        (
          value,
        ): value is {
          eventSeries: EventSeries;
          occurrence: EventOccurrence;
          participant: EventOccurrenceParticipant;
        } => Boolean(value),
      );

    if (representativeParticipants.length === 0) {
      return [];
    }

    const occurrenceParticipantsByOccurrenceId = new Map<string, EventOccurrenceParticipant[]>();
    const representativeOccurrenceParticipants = await EventOccurrenceParticipantDAO.readByOccurrences(
      representativeParticipants.map(({ occurrence }) => occurrence.occurrenceId),
    );

    for (const occurrenceParticipant of representativeOccurrenceParticipants) {
      const occurrenceEntries = occurrenceParticipantsByOccurrenceId.get(occurrenceParticipant.occurrenceId) ?? [];
      occurrenceEntries.push(occurrenceParticipant);
      occurrenceParticipantsByOccurrenceId.set(occurrenceParticipant.occurrenceId, occurrenceEntries);
    }

    return representativeParticipants.map(({ eventSeries, occurrence, participant }) => {
      const occurrenceParticipants = occurrenceParticipantsByOccurrenceId.get(occurrence.occurrenceId) ?? [];
      const eventWithOccurrenceSnapshot = {
        ...eventSeries,
        participants: occurrenceParticipants.map((occurrenceParticipant) =>
          this.toSeriesParticipant(eventSeries.eventId, occurrenceParticipant),
        ),
        rsvpCount: sumActiveOccurrenceRsvpCount(occurrenceParticipants),
      } as EventSeries & { myRsvp?: EventSeriesParticipant | null };

      const seriesParticipant = this.toSeriesParticipant(eventSeries.eventId, participant, eventWithOccurrenceSnapshot);
      eventWithOccurrenceSnapshot.myRsvp = this.toSeriesParticipant(eventSeries.eventId, participant);

      return seriesParticipant;
    });
  }
}

export default EventSeriesParticipantService;
