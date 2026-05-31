import {
  buildIsoFromTimeZoneDateAndTime,
  buildOccurrenceParticipantBreakdown,
  buildOrganizerOccurrenceQueryOptions,
  formatDateInputInTimeZone,
  formatTimeInputInTimeZone,
  getOrganizerOccurrenceTone,
  getOrganizerOccurrenceWindow,
  ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS,
  ORGANIZER_OCCURRENCE_LOOKBACK_DAYS,
} from '@/lib/events/organizerSessions';
import { EventOccurrenceStatus, ParticipantStatus, SortOrderInput } from '@data/graphql/types/graphql';

describe('organizer session helpers (mobile)', () => {
  it('builds occurrence query options for a managed event series', () => {
    const dateRange = {
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-11-01T23:59:59.999Z'),
    };

    expect(buildOrganizerOccurrenceQueryOptions('event-1', dateRange, 18, 6)).toEqual({
      dateRange,
      filters: [{ field: 'eventId', value: 'event-1' }],
      pagination: { limit: 18, skip: 6 },
      sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
    });
  });

  it('builds a rolling organizer operations window', () => {
    const before = new Date();
    const { startDate, endDate } = getOrganizerOccurrenceWindow();
    const after = new Date();

    const minExpectedStart = new Date(before);
    minExpectedStart.setDate(minExpectedStart.getDate() - ORGANIZER_OCCURRENCE_LOOKBACK_DAYS);
    minExpectedStart.setHours(0, 0, 0, 0);

    const maxExpectedStart = new Date(after);
    maxExpectedStart.setDate(maxExpectedStart.getDate() - ORGANIZER_OCCURRENCE_LOOKBACK_DAYS);
    maxExpectedStart.setHours(0, 0, 0, 0);

    const minExpectedEnd = new Date(before);
    minExpectedEnd.setDate(minExpectedEnd.getDate() + ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS);
    minExpectedEnd.setHours(23, 59, 59, 999);

    const maxExpectedEnd = new Date(after);
    maxExpectedEnd.setDate(maxExpectedEnd.getDate() + ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS);
    maxExpectedEnd.setHours(23, 59, 59, 999);

    expect(startDate.getTime()).toBeGreaterThanOrEqual(minExpectedStart.getTime());
    expect(startDate.getTime()).toBeLessThanOrEqual(maxExpectedStart.getTime());
    expect(endDate.getTime()).toBeGreaterThanOrEqual(minExpectedEnd.getTime());
    expect(endDate.getTime()).toBeLessThanOrEqual(maxExpectedEnd.getTime());
  });

  it('summarises attendee counts across occurrence RSVP states', () => {
    expect(
      buildOccurrenceParticipantBreakdown([
        { participantId: '1', status: ParticipantStatus.Going, quantity: 2 } as any,
        { participantId: '2', status: ParticipantStatus.CheckedIn, quantity: 1 } as any,
        { participantId: '3', status: ParticipantStatus.Interested, quantity: 3 } as any,
        { participantId: '4', status: ParticipantStatus.Waitlisted, quantity: 1 } as any,
        { participantId: '5', status: ParticipantStatus.Cancelled, quantity: 4 } as any,
      ]),
    ).toEqual({
      checkedIn: 1,
      going: 3,
      interested: 3,
      waitlisted: 1,
    });
  });

  it('round-trips timezone-local date and time into an ISO timestamp', () => {
    const iso = buildIsoFromTimeZoneDateAndTime('2026-05-29', '18:30', 'Africa/Johannesburg');

    expect(iso).toBe('2026-05-29T16:30:00.000Z');
    expect(formatDateInputInTimeZone(iso, 'Africa/Johannesburg')).toBe('2026-05-29');
    expect(formatTimeInputInTimeZone(iso, 'Africa/Johannesburg')).toBe('18:30');
  });

  it('maps occurrence statuses to the organizer management pill tones', () => {
    expect(getOrganizerOccurrenceTone(EventOccurrenceStatus.Scheduled)).toBe('primary');
    expect(getOrganizerOccurrenceTone(EventOccurrenceStatus.Completed)).toBe('default');
    expect(getOrganizerOccurrenceTone(EventOccurrenceStatus.Cancelled)).toBe('error');
  });
});
