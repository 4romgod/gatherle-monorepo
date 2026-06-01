import dayjs from 'dayjs';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import EventsMonthView from '@/components/events/calendar/EventsMonthView';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { EventOccurrenceStatus } from '@/data/graphql/types/graphql';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function buildOccurrence(overrides: Partial<EventOccurrencePreview>): EventOccurrencePreview {
  return {
    occurrenceId: 'occ-1',
    occurrenceKey: 'occ-1',
    eventSeriesId: 'series-1',
    startAt: '2026-06-03T07:00:00.000Z',
    endAt: '2026-06-03T15:00:00.000Z',
    timezone: 'Africa/Johannesburg',
    originalStartAt: null,
    status: EventOccurrenceStatus.Scheduled,
    isException: false,
    rsvpCount: 0,
    participants: [],
    myRsvp: null,
    eventSeries: {
      eventId: 'series-1',
      slug: 'emergent-labs',
      title: 'Emergent Labs Founders Studio Day',
      summary: 'A builder session',
      description: 'A builder session',
      location: {
        details: 'Remote',
        address: {
          city: 'Remote',
          state: null,
          country: null,
        },
      },
      media: null,
      status: null,
      participants: [],
      myRsvp: null,
      isSavedByMe: false,
      eventCategories: [],
    } as EventOccurrencePreview['eventSeries'],
    ...overrides,
  } as EventOccurrencePreview;
}

describe('EventsMonthView', () => {
  it('preserves a user-selected day when occurrence data refreshes for the same month', () => {
    const anchorDate = dayjs('2026-06-01');
    const initialOccurrences = [
      buildOccurrence({ occurrenceId: 'occ-1', occurrenceKey: 'occ-1' }),
      buildOccurrence({
        occurrenceId: 'occ-2',
        occurrenceKey: 'occ-2',
        eventSeriesId: 'series-2',
        startAt: '2026-06-06T06:00:00.000Z',
        endAt: '2026-06-06T10:00:00.000Z',
        eventSeries: {
          ...buildOccurrence({}).eventSeries!,
          eventId: 'series-2',
          slug: 'mampoer-festival',
          title: 'Mampoer Festival',
        },
      }),
    ];

    const { rerender } = render(<EventsMonthView anchorDate={anchorDate} occurrences={initialOccurrences} />);

    const juneSixthButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.replace(/\s+/g, '').startsWith('6'));

    expect(juneSixthButton).toBeTruthy();
    fireEvent.click(juneSixthButton!);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Saturday,\s+June 6/i })).toBeTruthy();

    rerender(<EventsMonthView anchorDate={anchorDate} occurrences={[...initialOccurrences]} />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Saturday,\s+June 6/i })).toBeTruthy();
  });
});
