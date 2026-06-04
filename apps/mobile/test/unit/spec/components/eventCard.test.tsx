import { render, screen } from '@testing-library/react-native';
import { EventCard } from '@/components/events/EventCard';

const mockUseEventCardActions = jest.fn();

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => ({
    authToken: 'token',
    isAuthenticated: true,
  }),
}));

jest.mock('@/app/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => false,
    navigate: jest.fn(),
  },
}));

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      mode: 'light',
      colors: {
        border: '#d9dee7',
        heroBackground: '#0b1736',
        heroGradient: ['#0b1736', '#123456'],
        heroText: '#ffffff',
        primary: '#5850ec',
        primarySoft: '#ede9fe',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        surfaceRaised: '#eef2ff',
        success: '#12b76a',
        successSoft: '#dcfae6',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
      },
    },
  }),
}));

jest.mock('@/hooks/events/useEventCardActions', () => ({
  useEventCardActions: () => mockUseEventCardActions(),
}));

jest.mock('@/components/events/card/EventCardActionButton', () => ({
  EventCardActionButton: ({ icon }: { icon: string }) => icon,
}));

jest.mock('@/components/events/detail/EventRsvpSheet', () => ({
  EventRsvpSheet: () => null,
}));

jest.mock('@/lib/events/deviceActions', () => ({
  shareEvent: jest.fn(),
}));

describe('EventCard', () => {
  beforeEach(() => {
    mockUseEventCardActions.mockReturnValue({
      cancelRsvp: jest.fn(),
      goingToEvent: jest.fn(),
      interestedInEvent: jest.fn(),
      isSaved: false,
      loading: false,
      participantCount: 3,
      rsvpLoading: false,
      rsvpStatus: null,
      saveLoading: false,
      toggleSave: jest.fn(),
    });
  });

  it('renders participant avatar fallbacks on featured cards when RSVP previews exist', () => {
    render(
      <EventCard
        occurrence={
          {
            occurrenceId: 'occ-1',
            occurrenceKey: 'occ-1',
            eventSeriesId: 'series-1',
            startAt: '2026-06-10T18:00:00.000Z',
            endAt: '2026-06-10T20:00:00.000Z',
            timezone: 'Africa/Johannesburg',
            originalStartAt: '2026-06-10T18:00:00.000Z',
            status: 'Scheduled',
            isException: false,
            rsvpCount: 3,
            participants: [
              {
                participantId: 'participant-1',
                occurrenceId: 'occ-1',
                userId: 'user-1',
                status: 'Going',
                quantity: 1,
                user: {
                  userId: 'user-1',
                  username: 'ada',
                  given_name: 'Ada',
                  family_name: 'Lovelace',
                  profile_picture: null,
                },
              },
              {
                participantId: 'participant-2',
                occurrenceId: 'occ-1',
                userId: 'user-2',
                status: 'Interested',
                quantity: 1,
                user: {
                  userId: 'user-2',
                  username: 'grace',
                  given_name: 'Grace',
                  family_name: 'Hopper',
                  profile_picture: null,
                },
              },
            ],
            eventSeries: {
              title: 'Featured Event',
              savedByCount: 0,
              location: {
                address: {
                  city: 'Johannesburg',
                  state: 'Gauteng',
                  country: 'South Africa',
                },
              },
              media: {
                featuredImageUrl: null,
              },
            },
          } as any
        }
        variant="featured"
      />,
    );

    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('GH')).toBeTruthy();
  });

  it('renders only the standard attendance label when there is no social proof yet', () => {
    mockUseEventCardActions.mockReturnValue({
      cancelRsvp: jest.fn(),
      goingToEvent: jest.fn(),
      interestedInEvent: jest.fn(),
      isSaved: false,
      loading: false,
      participantCount: 0,
      rsvpLoading: false,
      rsvpStatus: null,
      saveLoading: false,
      toggleSave: jest.fn(),
    });

    render(
      <EventCard
        occurrence={
          {
            occurrenceId: 'occ-2',
            occurrenceKey: 'occ-2',
            eventSeriesId: 'series-2',
            startAt: '2026-06-10T18:00:00.000Z',
            endAt: '2026-06-10T20:00:00.000Z',
            timezone: 'Africa/Johannesburg',
            originalStartAt: '2026-06-10T18:00:00.000Z',
            status: 'Scheduled',
            isException: false,
            rsvpCount: 0,
            participants: [],
            eventSeries: {
              title: 'Quiet Event',
              savedByCount: 0,
              location: {
                address: {
                  city: 'Johannesburg',
                  state: 'Gauteng',
                  country: 'South Africa',
                },
              },
              media: {
                featuredImageUrl: null,
              },
            },
          } as any
        }
        variant="featured"
      />,
    );

    expect(screen.getAllByText('0 goings')).toHaveLength(1);
  });
});
