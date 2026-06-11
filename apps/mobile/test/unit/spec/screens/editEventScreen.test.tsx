import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { OrganizationRole } from '@data/graphql/types/graphql';
import { EditEventScreen } from '@/screens/account/EditEventScreen';

const mockNavigate = jest.fn();
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseLazyQuery = jest.fn();
const mockShowToast = jest.fn();
const mockWithBlockingLoader = jest.fn();
const mockUpdateEvent = jest.fn();
const mockMapEventSeriesToOccurrence = jest.fn();

jest.mock('@apollo/client', () => ({
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@data/graphql/mutation/Event/mutation', () => ({
  UpdateEventDocument: 'UpdateEventDocument',
}));

jest.mock('@data/graphql/query/Event/query', () => ({
  GetEventByIdDocument: 'GetEventByIdDocument',
}));

jest.mock('@data/graphql/query/EventCategory/query', () => ({
  GetEventCategoriesDocument: 'GetEventCategoriesDocument',
}));

jest.mock('@data/graphql/query/Media/query', () => ({
  GetMediaUploadUrlDocument: 'GetMediaUploadUrlDocument',
}));

jest.mock('@data/graphql/query/Organization/query', () => ({
  GetMyOrganizationsDocument: 'GetMyOrganizationsDocument',
}));

jest.mock('@data/graphql/query/Venue/query', () => ({
  GetVenuesDocument: 'GetVenuesDocument',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { eventId: 'event-1' } }),
}));

jest.mock('@/app/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    showToast: mockShowToast,
    withBlockingLoader: mockWithBlockingLoader,
  }),
}));

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => ({
    authToken: 'token',
    isAuthenticated: true,
    userId: 'user-1',
    username: 'organizer-a',
  }),
}));

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#05070d',
        border: '#1f2430',
        primary: '#6c63ff',
        secondary: '#ff8b3d',
        surface: '#0f1420',
        textPrimary: '#f4f7fb',
        textSecondary: '#b7c0d1',
      },
    },
  }),
}));

jest.mock('@/hooks/core/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ onRefresh: jest.fn(), refreshing: false }),
}));

jest.mock('@/lib/auth', () => ({
  getApolloAuthContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/events/adapters', () => ({
  mapEventSeriesToOccurrence: (...args: unknown[]) => mockMapEventSeriesToOccurrence(...args),
}));

jest.mock('@/components/core/PageContainer', () => ({
  PageContainer: ({ children }: React.PropsWithChildren) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

jest.mock('@/components/core/SectionHeading', () => ({
  SectionHeading: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/core/DatePickerField', () => ({
  DatePickerField: ({
    label,
    onChangeDate,
    value,
  }: {
    label: string;
    onChangeDate?: (value: string) => void;
    value?: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{label}</ReactNative.Text>
        <ReactNative.TextInput accessibilityLabel={label} value={value} onChangeText={onChangeDate} />
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/TimePickerField', () => ({
  TimePickerField: ({
    label,
    onChangeTime,
    value,
  }: {
    label: string;
    onChangeTime?: (value: string) => void;
    value?: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{label}</ReactNative.Text>
        <ReactNative.TextInput accessibilityLabel={label} value={value} onChangeText={onChangeTime} />
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/auth/AuthPromptCard', () => ({
  AuthPromptCard: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/account/shared/AccountTextField', () => ({
  AccountTextField: ({
    label,
    onChangeText,
    value,
  }: {
    label: string;
    onChangeText?: (value: string) => void;
    value?: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{label}</ReactNative.Text>
        <ReactNative.TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/account/shared/AccountChoiceChip', () => ({
  AccountChoiceChip: ({ label, onPress }: { label: string; onPress?: () => void }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{label}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
}));

jest.mock('@/components/account/shared/AccountSwitchRow', () => ({
  AccountSwitchRow: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/account/shared/AccountPrimaryButton', () => ({
  AccountPrimaryButton: ({ label, onPress }: { label: string; onPress?: () => void }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{label}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
}));

const buildEvent = (title: string) => ({
  allowGuestPlusOnes: true,
  capacity: 25,
  description: 'A social event for the neighborhood.',
  eventCategories: [],
  eventId: 'event-1',
  eventLink: 'https://gatherle.test/events/event-1',
  isSavedByMe: false,
  lifecycleStatus: 'Published',
  location: {
    address: {
      city: 'Cape Town',
      country: 'South Africa',
      state: 'Western Cape',
      street: '1 Loop Street',
      zipCode: '8000',
    },
    details: 'Main hall',
    locationType: 'Physical',
  },
  media: {
    featuredImageUrl: 'https://images.example.com/event-1.jpg',
  },
  myRsvp: null,
  organization: {
    logo: null,
    name: 'Org A',
    orgId: 'org-1',
    slug: 'org-a',
  },
  orgId: 'org-1',
  organizers: [],
  primarySchedule: {
    anchorStartAt: '2026-07-01T18:00:00.000Z',
    occurrenceDurationMinutes: 90,
    recurrenceRule: '',
    timezone: 'Africa/Johannesburg',
  },
  privacySetting: 'Public',
  representativeOccurrence: {
    endAt: '2026-07-01T19:30:00.000Z',
    eventSeriesId: 'event-1',
    isException: false,
    myRsvp: null,
    occurrenceId: 'occ-1',
    occurrenceKey: 'occ-1',
    originalStartAt: '2026-07-01T18:00:00.000Z',
    participants: [],
    rsvpCount: 0,
    startAt: '2026-07-01T18:00:00.000Z',
    status: 'Scheduled',
    timezone: 'Africa/Johannesburg',
  },
  rsvpCount: 0,
  savedByCount: 0,
  slug: 'event-1',
  status: 'Upcoming',
  summary: 'Neighborhood social',
  title,
  venueId: null,
  visibility: 'Public',
  waitlistEnabled: false,
});

describe('EditEventScreen', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockWithBlockingLoader.mockImplementation(async (_label: string, action: () => Promise<unknown>) => action());
    mockUpdateEvent.mockResolvedValue({
      data: {
        updateEvent: {
          eventId: 'event-1',
        },
      },
    });
    mockRefetch.mockResolvedValue({
      data: {
        readEventById: buildEvent('Updated Event Title'),
      },
    });
    mockMapEventSeriesToOccurrence.mockReturnValue({
      occurrenceId: 'occ-1',
      eventSeries: {
        eventId: 'event-1',
        slug: 'event-1',
        title: 'Updated Event Title',
      },
    });

    mockUseQuery.mockImplementation((document: string) => {
      if (document === 'GetEventByIdDocument') {
        return {
          data: {
            readEventById: buildEvent('Original Event Title'),
          },
          loading: false,
          refetch: mockRefetch,
        };
      }

      if (document === 'GetEventCategoriesDocument') {
        return {
          data: {
            readEventCategories: [
              { eventCategoryId: 'category-tech', name: 'Tech' },
              { eventCategoryId: 'category-art', name: 'Art' },
            ],
          },
          loading: false,
          refetch: jest.fn(),
        };
      }

      if (document === 'GetMyOrganizationsDocument') {
        return {
          data: {
            readMyOrganizations: [
              {
                role: OrganizationRole.Admin,
                organization: { orgId: 'org-1', name: 'Org A' },
              },
              {
                role: OrganizationRole.Admin,
                organization: { orgId: 'org-2', name: 'Org B' },
              },
            ],
          },
          loading: false,
          refetch: jest.fn(),
        };
      }

      if (document === 'GetVenuesDocument') {
        return {
          data: {
            readVenues: [],
          },
          loading: false,
          refetch: jest.fn(),
        };
      }

      throw new Error(`Unexpected query document: ${document}`);
    });

    mockUseMutation.mockImplementation((document: string) => {
      if (document === 'UpdateEventDocument') {
        return [mockUpdateEvent, { loading: false }];
      }

      throw new Error(`Unexpected mutation document: ${document}`);
    });

    mockUseLazyQuery.mockReturnValue([jest.fn()]);
  });

  it('redirects to the edited event detail page after saving', async () => {
    render(<EditEventScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('2026-07-01')).toBeTruthy());

    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(mockUpdateEvent).toHaveBeenCalled());
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('EventDetails', {
        occurrence: expect.objectContaining({
          occurrenceId: 'occ-1',
          eventSeries: expect.objectContaining({
            eventId: 'event-1',
            title: 'Updated Event Title',
          }),
        }),
      }),
    );
  });

  it('shows advanced recurrence controls when switching to recurring', async () => {
    render(<EditEventScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('2026-07-01')).toBeTruthy());

    fireEvent.press(screen.getByText('Recurring'));
    fireEvent.press(screen.getByText('Weekly'));

    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('Days of the week')).toBeTruthy();
  });

  it('saves advanced recurrence, organization, categories, and location changes', async () => {
    render(<EditEventScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('2026-07-01')).toBeTruthy());

    fireEvent.changeText(screen.getByDisplayValue('Original Event Title'), 'Updated Mobile Event');
    fireEvent.changeText(screen.getByLabelText('Date'), '2026-07-02');
    fireEvent.changeText(screen.getByLabelText('Start'), '19:15');
    fireEvent.changeText(screen.getByLabelText('End'), '21:00');
    fireEvent.press(screen.getByText('UTC'));
    fireEvent.changeText(screen.getByLabelText('City'), 'Johannesburg');
    fireEvent.changeText(screen.getByLabelText('State'), 'Gauteng');
    fireEvent.changeText(screen.getByLabelText('Postal code'), '2000');
    fireEvent.press(screen.getByText('Org B'));
    fireEvent.press(screen.getByText('Tech'));
    fireEvent.press(screen.getByText('Recurring'));
    fireEvent.press(screen.getByText('Yearly'));
    fireEvent.changeText(screen.getByLabelText('Interval'), '2');
    fireEvent.changeText(screen.getByLabelText('Repeat until'), '2027-07-02');
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() =>
      expect(mockUpdateEvent).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({
            eventId: 'event-1',
            eventCategories: ['category-tech'],
            location: expect.objectContaining({
              address: expect.objectContaining({
                city: 'Johannesburg',
                country: 'South Africa',
                state: 'Gauteng',
                zipCode: '2000',
              }),
              locationType: 'venue',
            }),
            locationSnapshot: 'Johannesburg, Gauteng, South Africa',
            orgId: 'org-2',
            primarySchedule: {
              anchorStartAt: '2026-07-02T19:15:00.000Z',
              occurrenceDurationMinutes: 105,
              recurrenceRule: 'FREQ=YEARLY;INTERVAL=2;UNTIL=20270702T191500Z',
              timezone: 'UTC',
            },
            title: 'Updated Mobile Event',
          }),
        },
      }),
    );
  });

  it('saves online location changes using the shared location contract', async () => {
    render(<EditEventScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('2026-07-01')).toBeTruthy());

    fireEvent.press(screen.getByText('Online'));
    fireEvent.changeText(screen.getByLabelText('Online location details'), 'Zoom room A');
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() =>
      expect(mockUpdateEvent).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({
            eventId: 'event-1',
            location: {
              details: 'Zoom room A',
              locationType: 'online',
            },
            locationSnapshot: 'Zoom room A',
            venueId: undefined,
          }),
        },
      }),
    );
  });
});
