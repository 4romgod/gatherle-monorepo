import { ParticipantStatus } from '@/data/graphql/types/graphql';
import {
  getEventPreviewHref,
  getEventPreviewOccurrenceId,
  getEventPreviewScheduleText,
  getEventPreviewParticipantCount,
  getEventPreviewMyRsvpStatus,
  isEventPreviewUpcoming,
  projectOccurrenceRsvpToEventPreview,
} from '@/components/events/event-preview-utils';

describe('event-preview-utils', () => {
  it('projects an occurrence RSVP into an occurrence preview with myRsvp data', () => {
    const preview = projectOccurrenceRsvpToEventPreview({
      participantId: 'participant-1',
      occurrenceId: 'event-1#2026-06-01T18:00:00.000Z',
      status: ParticipantStatus.Going,
      quantity: 2,
      occurrence: {
        occurrenceId: 'event-1#2026-06-01T18:00:00.000Z',
        occurrenceKey: 'event-1#2026-06-01T18:00:00.000Z',
        eventSeriesId: 'event-1',
        startAt: '2026-06-01T18:00:00.000Z',
        endAt: '2026-06-01T20:00:00.000Z',
        timezone: 'Africa/Johannesburg',
        originalStartAt: '2026-06-01T18:00:00.000Z',
        status: 'Scheduled',
        isException: false,
        rsvpCount: 4,
        eventSeries: {
          eventId: 'event-1',
          slug: 'weekly-yoga',
          title: 'Weekly Yoga',
          media: { featuredImageUrl: null },
          location: null,
          status: 'Upcoming',
          primarySchedule: null,
          participants: [],
          organizers: [],
          savedByCount: 0,
          isSavedByMe: false,
        },
      } as any,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        occurrenceId: 'event-1#2026-06-01T18:00:00.000Z',
        participants: [],
        myRsvp: expect.objectContaining({
          participantId: 'participant-1',
          occurrenceId: 'event-1#2026-06-01T18:00:00.000Z',
          status: ParticipantStatus.Going,
          quantity: 2,
        }),
      }),
    );
    expect(getEventPreviewHref(preview!)).toBe('/events/weekly-yoga?occurs=2026-06-01T18%3A00%3A00.000Z');
  });

  it('treats future occurrences as upcoming and past occurrences as not upcoming', () => {
    const futureOccurrence = {
      occurrenceId: 'future-occurrence',
      occurrenceKey: 'future-occurrence',
      eventSeriesId: 'event-1',
      startAt: '2026-06-02T18:00:00.000Z',
      endAt: '2026-06-02T20:00:00.000Z',
      timezone: 'Africa/Johannesburg',
      originalStartAt: '2026-06-02T18:00:00.000Z',
      status: 'Scheduled',
      isException: false,
      rsvpCount: 0,
      participants: [],
      myRsvp: null,
      eventSeries: {
        eventId: 'event-1',
        slug: 'weekly-yoga',
        title: 'Weekly Yoga',
        media: { featuredImageUrl: null },
        location: null,
        status: 'Upcoming',
        primarySchedule: null,
        participants: [],
        organizers: [],
        savedByCount: 0,
        isSavedByMe: false,
      },
    } as any;

    const pastOccurrence = {
      ...futureOccurrence,
      occurrenceId: 'past-occurrence',
      occurrenceKey: 'past-occurrence',
      startAt: '2026-05-30T18:00:00.000Z',
      endAt: '2026-05-30T20:00:00.000Z',
      originalStartAt: '2026-05-30T18:00:00.000Z',
    };

    const pivot = new Date('2026-06-01T12:00:00.000Z');

    expect(isEventPreviewUpcoming(futureOccurrence, pivot)).toBe(true);
    expect(isEventPreviewUpcoming(pastOccurrence, pivot)).toBe(false);
  });

  it('prefers representative occurrences for series-backed previews', () => {
    const seriesPreview = {
      eventId: 'event-1',
      slug: 'weekly-yoga',
      title: 'Weekly Yoga',
      status: 'Upcoming',
      location: null,
      primarySchedule: {
        startAt: '2026-06-01T18:00:00.000Z',
        endAt: '2026-06-01T20:00:00.000Z',
        timezone: 'Africa/Johannesburg',
        recurrenceRule: 'DTSTART:20260601T180000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO',
      },
      participants: [],
      organizers: [],
      media: { featuredImageUrl: null },
      savedByCount: 0,
      isSavedByMe: false,
      myRsvp: null,
      representativeOccurrence: {
        occurrenceId: 'event-1#2026-06-08T18:00:00.000Z',
        occurrenceKey: 'event-1#2026-06-08T18:00:00.000Z',
        eventSeriesId: 'event-1',
        originalStartAt: '2026-06-08T18:00:00.000Z',
        startAt: '2026-06-08T18:00:00.000Z',
        endAt: '2026-06-08T20:00:00.000Z',
        timezone: 'Africa/Johannesburg',
        status: 'Scheduled',
        isException: false,
        rsvpCount: 7,
        participants: [],
        myRsvp: {
          participantId: 'participant-1',
          occurrenceId: 'event-1#2026-06-08T18:00:00.000Z',
          status: ParticipantStatus.Going,
          quantity: 1,
        },
      },
    } as any;

    expect(getEventPreviewOccurrenceId(seriesPreview)).toBe('event-1#2026-06-08T18:00:00.000Z');
    expect(getEventPreviewHref(seriesPreview)).toBe('/events/weekly-yoga?occurs=2026-06-08T18%3A00%3A00.000Z');
    expect(getEventPreviewScheduleText(seriesPreview)).toContain('June');
    expect(getEventPreviewParticipantCount(seriesPreview)).toBe(7);
    expect(getEventPreviewMyRsvpStatus(seriesPreview)).toBe(ParticipantStatus.Going);
  });
});
