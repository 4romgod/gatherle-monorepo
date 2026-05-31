import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MyEventsScreen } from '@/screens/account/MyEventsScreen';

const mockNavigate = jest.fn();
const mockUseHostedEventsByUser = jest.fn();
const mockUseMyEventOccurrenceRsvps = jest.fn();
const mockUseSavedEvents = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => ({
    authToken: 'token',
    isAuthenticated: true,
    userId: 'user-1',
  }),
}));

jest.mock('@/hooks/core/usePullToRefresh', () => ({
  usePullToRefresh: (refreshFn: () => Promise<unknown>) => ({ onRefresh: refreshFn, refreshing: false }),
}));

jest.mock('@/hooks/events/useHostedEventsByUser', () => ({
  useHostedEventsByUser: (...args: unknown[]) => mockUseHostedEventsByUser(...args),
}));

jest.mock('@/hooks/events/useMyEventOccurrenceRsvps', () => ({
  useMyEventOccurrenceRsvps: (...args: unknown[]) => mockUseMyEventOccurrenceRsvps(...args),
}));

jest.mock('@/hooks/events/useSavedEvents', () => ({
  useSavedEvents: (...args: unknown[]) => mockUseSavedEvents(...args),
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

jest.mock('@/components/core/StateNotice', () => ({
  StateNotice: ({ message }: { message: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{message}</ReactNative.Text>;
  },
}));

jest.mock('@/components/auth/AuthPromptCard', () => ({
  AuthPromptCard: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/skeleton/EventCardSkeleton', () => ({
  EventCardSkeleton: () => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>Skeleton</ReactNative.Text>;
  },
}));

jest.mock('@/components/events/EventCard', () => ({
  EventCard: ({
    occurrence,
    onPress,
  }: {
    occurrence: { eventSeries?: { title?: string | null } };
    onPress?: () => void;
  }) =>
    (() => {
      const ReactNative = require('react-native');
      return <ReactNative.Text onPress={onPress}>{occurrence.eventSeries?.title ?? 'Hosted event'}</ReactNative.Text>;
    })(),
}));

describe('MyEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostedEventsByUser.mockReturnValue({
      error: null,
      hostedEvents: [
        {
          occurrenceId: 'occ-1',
          eventSeriesId: 'series-1',
          eventSeries: {
            eventId: 'event-1',
            title: 'Cape Town Wellness Immersion',
          },
        },
      ],
      loading: false,
      refetch: jest.fn(),
    });
    mockUseMyEventOccurrenceRsvps.mockReturnValue({
      error: null,
      loading: false,
      refetch: jest.fn(),
      upcomingEvents: [],
    });
    mockUseSavedEvents.mockReturnValue({
      error: null,
      loading: false,
      refetch: jest.fn(),
      savedEvents: [],
    });
  });

  it('opens hosted events through the event tile instead of inline management buttons', () => {
    render(<MyEventsScreen />);

    expect(screen.queryByText('Edit event')).toBeNull();
    expect(screen.queryByText('Sessions')).toBeNull();

    fireEvent.press(screen.getByText('Cape Town Wellness Immersion'));
    expect(mockNavigate).toHaveBeenCalledWith('EventDetails', {
      occurrence: expect.objectContaining({
        eventSeries: expect.objectContaining({
          eventId: 'event-1',
          title: 'Cape Town Wellness Immersion',
        }),
        occurrenceId: 'occ-1',
      }),
    });
  });
});
