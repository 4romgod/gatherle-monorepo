jest.mock('@/utils', () => ({
  CustomError: jest.fn((message: string, errorType: any) => {
    const error = new Error(message) as any;
    error.extensions = { code: errorType?.errorCode, http: { status: errorType?.errorStatus } };
    return error;
  }),
  ErrorTypes: {
    BAD_REQUEST: { errorCode: 'BAD_REQUEST', errorStatus: 400 },
    NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
  },
  projectOccurrenceParticipantToSeriesParticipant: jest.fn((eventId: string, participant: any, event?: any) => ({
    participantId: participant.participantId,
    eventId,
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity,
    invitedBy: participant.invitedBy,
    sharedVisibility: participant.sharedVisibility,
    rsvpAt: participant.rsvpAt,
    cancelledAt: participant.cancelledAt,
    checkedInAt: participant.checkedInAt,
    ...(event ? { event } : {}),
  })),
  isOccurrenceUpcoming: jest.fn((occurrence: any, fromDate: Date = new Date()) => {
    const effectiveEndAt = occurrence.endAt ?? occurrence.startAt;
    return new Date(effectiveEndAt).getTime() >= fromDate.getTime();
  }),
  sumActiveOccurrenceRsvpCount: jest.fn((participants: any[]) =>
    participants.reduce(
      (total, participant) =>
        participant.status === 'Going' || participant.status === 'Interested' || participant.status === 'CheckedIn'
          ? total + Math.max(1, participant.quantity ?? 1)
          : total,
      0,
    ),
  ),
}));

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    readEventById: jest.fn(),
  },
  EventOccurrenceDAO: {
    readByOccurrenceIds: jest.fn(),
  },
  EventOccurrenceParticipantDAO: {
    readByOccurrence: jest.fn(),
    readByOccurrences: jest.fn(),
    readByOccurrenceAndUser: jest.fn(),
    readByUser: jest.fn(),
  },
}));

jest.mock('@/services/eventOccurrence', () => ({
  __esModule: true,
  default: {
    readRepresentativeOccurrenceForSeries: jest.fn(),
  },
}));

jest.mock('@/services/eventOccurrenceParticipant', () => ({
  __esModule: true,
  default: {
    rsvp: jest.fn(),
    cancel: jest.fn(),
    checkIn: jest.fn(),
  },
}));

import { EventSeriesParticipantService } from '@/services';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import EventOccurrenceService from '@/services/eventOccurrence';
import EventOccurrenceParticipantService from '@/services/eventOccurrenceParticipant';
import type { EventOccurrence, EventOccurrenceParticipant, EventSeries } from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';

describe('EventSeriesParticipantService', () => {
  const singleEventSeries: EventSeries = {
    eventId: 'event-1',
    slug: 'one-time-meetup',
    title: 'One Time Meetup',
    description: 'Single event',
    primarySchedule: {
      anchorStartAt: new Date('2026-05-10T10:00:00.000Z'),
      occurrenceDurationMinutes: 120,
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260510T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
    },
    status: 'Upcoming' as any,
    location: { type: 'Online', coordinates: [0, 0] } as any,
    eventCategories: [],
    organizers: [],
  };

  const recurringEventSeries: EventSeries = {
    ...singleEventSeries,
    eventId: 'event-2',
    slug: 'weekly-yoga',
    primarySchedule: {
      ...singleEventSeries.primarySchedule!,
      recurrenceRule: 'DTSTART:20260510T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=SU',
    },
  };

  const singleOccurrence: EventOccurrence = {
    occurrenceId: 'event-1#2026-05-10T10:00:00.000Z',
    eventSeriesId: 'event-1',
    occurrenceKey: 'event-1#2026-05-10T10:00:00.000Z',
    originalStartAt: new Date('2026-05-10T10:00:00.000Z'),
    startAt: new Date('2026-05-10T10:00:00.000Z'),
    endAt: new Date('2026-05-10T12:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const occurrenceParticipant: EventOccurrenceParticipant = {
    participantId: 'occ-participant-1',
    occurrenceId: singleOccurrence.occurrenceId,
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 2,
    rsvpAt: new Date('2026-05-01T10:00:00.000Z'),
  };

  const recurringOccurrence: EventOccurrence = {
    ...singleOccurrence,
    occurrenceId: 'event-2#2026-05-17T10:00:00.000Z',
    eventSeriesId: recurringEventSeries.eventId,
    occurrenceKey: 'event-2#2026-05-17T10:00:00.000Z',
    originalStartAt: new Date('2026-05-17T10:00:00.000Z'),
    startAt: new Date('2026-05-17T10:00:00.000Z'),
  };

  const recurringOccurrenceParticipant: EventOccurrenceParticipant = {
    ...occurrenceParticipant,
    participantId: 'occ-participant-2',
    occurrenceId: recurringOccurrence.occurrenceId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(singleEventSeries);
    (EventOccurrenceService.readRepresentativeOccurrenceForSeries as jest.Mock).mockResolvedValue(singleOccurrence);
    (EventOccurrenceParticipantService.rsvp as jest.Mock).mockResolvedValue(occurrenceParticipant);
    (EventOccurrenceParticipantService.cancel as jest.Mock).mockResolvedValue({
      ...occurrenceParticipant,
      status: ParticipantStatus.Cancelled,
      cancelledAt: new Date('2026-05-02T10:00:00.000Z'),
    });
    (EventOccurrenceParticipantService.checkIn as jest.Mock).mockResolvedValue({
      ...occurrenceParticipant,
      status: ParticipantStatus.CheckedIn,
      checkedInAt: new Date('2026-05-10T10:05:00.000Z'),
    });
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock).mockResolvedValue([occurrenceParticipant]);
    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(occurrenceParticipant);
    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([occurrenceParticipant]);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock).mockResolvedValue([singleOccurrence]);
  });

  it('delegates RSVP for a single-date event series to occurrence participation', async () => {
    const result = await EventSeriesParticipantService.rsvp({
      eventId: singleEventSeries.eventId,
      userId: 'user-1',
      status: ParticipantStatus.Going,
      quantity: 2,
    });

    expect(EventOccurrenceParticipantService.rsvp).toHaveBeenCalledWith(
      {
        occurrenceId: singleOccurrence.occurrenceId,
        status: ParticipantStatus.Going,
        quantity: 2,
        invitedBy: undefined,
        sharedVisibility: undefined,
      },
      'user-1',
    );
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        eventId: singleEventSeries.eventId,
        userId: occurrenceParticipant.userId,
        status: ParticipantStatus.Going,
      }),
    );
  });

  it('delegates recurring series-level RSVP operations to the representative occurrence', async () => {
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(recurringEventSeries);
    (EventOccurrenceService.readRepresentativeOccurrenceForSeries as jest.Mock).mockResolvedValue(recurringOccurrence);
    (EventOccurrenceParticipantService.rsvp as jest.Mock).mockResolvedValue(recurringOccurrenceParticipant);

    const result = await EventSeriesParticipantService.rsvp({
      eventId: recurringEventSeries.eventId,
      userId: 'user-1',
      status: ParticipantStatus.Going,
    });

    expect(EventOccurrenceParticipantService.rsvp).toHaveBeenCalledWith(
      expect.objectContaining({ occurrenceId: recurringOccurrence.occurrenceId }),
      'user-1',
    );
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result.eventId).toBe(recurringEventSeries.eventId);
  });

  it('delegates cancellation to the single occurrence', async () => {
    const result = await EventSeriesParticipantService.cancel({
      eventId: singleEventSeries.eventId,
      userId: 'user-1',
    });

    expect(EventOccurrenceParticipantService.cancel).toHaveBeenCalledWith(singleOccurrence.occurrenceId, 'user-1');
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result.status).toBe(ParticipantStatus.Cancelled);
  });

  it('delegates check-in to the single occurrence', async () => {
    const result = await EventSeriesParticipantService.checkIn(singleEventSeries.eventId, 'user-1');

    expect(EventOccurrenceParticipantService.checkIn).toHaveBeenCalledWith(singleOccurrence.occurrenceId, 'user-1');
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result.status).toBe(ParticipantStatus.CheckedIn);
  });

  it('reads participants for a single-date event series from occurrence participants', async () => {
    const result = await EventSeriesParticipantService.readByEvent(singleEventSeries.eventId);

    expect(EventOccurrenceParticipantDAO.readByOccurrence).toHaveBeenCalledWith(singleOccurrence.occurrenceId);
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        eventId: singleEventSeries.eventId,
        status: ParticipantStatus.Going,
      }),
    ]);
  });

  it('reads the current user participant for a single-date event series from the occurrence participant store', async () => {
    const result = await EventSeriesParticipantService.readByEventAndUser(singleEventSeries.eventId, 'user-1');

    expect(EventOccurrenceParticipantDAO.readByOccurrenceAndUser).toHaveBeenCalledWith(
      singleOccurrence.occurrenceId,
      'user-1',
    );
    expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        eventId: singleEventSeries.eventId,
      }),
    );
  });

  it('returns null when no occurrence participant exists for the user', async () => {
    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(null);

    const result = await EventSeriesParticipantService.readByEventAndUser(singleEventSeries.eventId, 'user-1');

    expect(result).toBeNull();
  });

  it('maps readByUser results back to representative event series participants for single and recurring series', async () => {
    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([
      occurrenceParticipant,
      recurringOccurrenceParticipant,
    ]);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock).mockResolvedValue([singleOccurrence, recurringOccurrence]);
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock).mockResolvedValue([occurrenceParticipant]);
    (EventOccurrenceParticipantDAO.readByOccurrences as jest.Mock).mockResolvedValue([
      occurrenceParticipant,
      recurringOccurrenceParticipant,
    ]);
    (EventSeriesDAO.readEventById as jest.Mock)
      .mockResolvedValueOnce(singleEventSeries)
      .mockResolvedValueOnce(recurringEventSeries);

    const result = await EventSeriesParticipantService.readByUser('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        eventId: singleEventSeries.eventId,
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        participantId: recurringOccurrenceParticipant.participantId,
        eventId: recurringEventSeries.eventId,
      }),
    );
  });

  it('returns an empty array when the user has no occurrence participants', async () => {
    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([]);

    const result = await EventSeriesParticipantService.readByUser('user-1');

    expect(result).toEqual([]);
    expect(EventOccurrenceDAO.readByOccurrenceIds).not.toHaveBeenCalled();
  });

  it('prefers the nearest upcoming active participant when multiple occurrences exist for one series', async () => {
    const laterOccurrence: EventOccurrence = {
      ...recurringOccurrence,
      occurrenceId: 'event-2#2026-05-24T10:00:00.000Z',
      occurrenceKey: 'event-2#2026-05-24T10:00:00.000Z',
      originalStartAt: new Date('2026-05-24T10:00:00.000Z'),
      startAt: new Date('2026-05-24T10:00:00.000Z'),
    };
    const cancelledSoonerParticipant: EventOccurrenceParticipant = {
      ...recurringOccurrenceParticipant,
      participantId: 'occ-participant-cancelled',
      status: ParticipantStatus.Cancelled,
      cancelledAt: new Date('2026-05-05T10:00:00.000Z'),
    };
    const activeLaterParticipant: EventOccurrenceParticipant = {
      ...recurringOccurrenceParticipant,
      participantId: 'occ-participant-later',
      occurrenceId: laterOccurrence.occurrenceId,
      rsvpAt: new Date('2026-05-06T10:00:00.000Z'),
    };

    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([
      cancelledSoonerParticipant,
      activeLaterParticipant,
    ]);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock).mockResolvedValue([recurringOccurrence, laterOccurrence]);
    (EventOccurrenceParticipantDAO.readByOccurrences as jest.Mock).mockResolvedValue([
      cancelledSoonerParticipant,
      activeLaterParticipant,
    ]);
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(recurringEventSeries);

    const result = await EventSeriesParticipantService.readByUser('user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        participantId: activeLaterParticipant.participantId,
        eventId: recurringEventSeries.eventId,
        status: ParticipantStatus.Going,
      }),
    );
  });
});
