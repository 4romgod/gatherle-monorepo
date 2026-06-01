import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EventsScreen } from '@/screens/events/EventsScreen';

const mockNavigate = jest.fn();
const mockUseFilteredMobileEvents = jest.fn();
const mockUseOccurrenceCalendarEvents = jest.fn();
const mockUseEventsFilters = jest.fn();
const mockOpenSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => ({
    authToken: 'token',
    userId: 'user-1',
  }),
}));

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        border: '#ddd',
        primary: '#5850ec',
        primarySoft: '#ede9fe',
        surface: '#fff',
        surfaceMuted: '#f8fafc',
        surfaceRaised: '#f2f2f2',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
        textMuted: '#98a2b3',
        primaryContrast: '#fff',
      },
    },
  }),
}));

jest.mock('@/hooks/core/usePullToRefresh', () => ({
  usePullToRefresh: (refreshFn: () => Promise<unknown>) => ({ onRefresh: refreshFn, refreshing: false }),
}));

jest.mock('@/hooks/core/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    onContentSizeChange: jest.fn(),
    onScroll: jest.fn(),
    scrollEventThrottle: 16,
  }),
}));

jest.mock('@/hooks/events/useFilteredMobileEvents', () => ({
  useFilteredMobileEvents: (...args: unknown[]) => mockUseFilteredMobileEvents(...args),
}));

jest.mock('@/hooks/events/useOccurrenceCalendarEvents', () => ({
  useOccurrenceCalendarEvents: (...args: unknown[]) => mockUseOccurrenceCalendarEvents(...args),
}));

jest.mock('@/hooks/events/useEventsFilters', () => ({
  countActiveFilters: (filters: {
    categories: string[];
    statuses: string[];
    dateOption: string | null;
    location: { city: string; state: string; country: string };
  }) => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.dateOption) count++;
    if (filters.location.city || filters.location.state || filters.location.country) count++;
    return count;
  },
  useEventsFilters: () => mockUseEventsFilters(),
}));

jest.mock('@/components/core/PageContainer', () => ({
  PageContainer: ({ children }: React.PropsWithChildren) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

jest.mock('@/components/core/FilterChip', () => ({
  FilterChip: ({ label }: { label: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{label}</ReactNative.Text>;
  },
}));

jest.mock('@/components/core/StateNotice', () => ({
  StateNotice: ({ message }: { message: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{message}</ReactNative.Text>;
  },
}));

jest.mock('@/components/core/EventSearchBar', () => ({
  EventSearchBar: () => null,
}));

jest.mock('@/components/events/EventCard', () => ({
  EventCard: ({ occurrence }: { occurrence: { eventSeries?: { title?: string | null } } }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{occurrence.eventSeries?.title ?? 'Event card'}</ReactNative.Text>;
  },
}));

jest.mock('@/components/events/EventsFilterSheet', () => ({
  EventsFilterSheet: ({ showDateFilter }: { showDateFilter?: boolean }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{showDateFilter ? 'Date filter visible' : 'Date filter hidden'}</ReactNative.Text>;
  },
}));

jest.mock('@/components/events/calendar/EventsViewTabs', () => ({
  EventsViewTabs: ({
    onChange,
    value,
  }: {
    onChange: (value: 'list' | 'week' | 'month') => void;
    value: 'list' | 'week' | 'month';
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{`Current view:${value}`}</ReactNative.Text>
        <ReactNative.Pressable onPress={() => onChange('list')}>
          <ReactNative.Text>List</ReactNative.Text>
        </ReactNative.Pressable>
        <ReactNative.Pressable onPress={() => onChange('week')}>
          <ReactNative.Text>Week</ReactNative.Text>
        </ReactNative.Pressable>
        <ReactNative.Pressable onPress={() => onChange('month')}>
          <ReactNative.Text>Month</ReactNative.Text>
        </ReactNative.Pressable>
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/events/calendar/EventsCalendarNavigator', () => ({
  EventsCalendarNavigator: ({ viewMode }: { viewMode: 'week' | 'month' }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{`${viewMode} navigator`}</ReactNative.Text>;
  },
}));

jest.mock('@/components/events/calendar/EventsWeekView', () => ({
  EventsWeekView: ({ occurrences }: { occurrences: Array<{ occurrenceId: string }> }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{`Week calendar:${occurrences.length}`}</ReactNative.Text>;
  },
}));

jest.mock('@/components/events/calendar/EventsMonthView', () => ({
  EventsMonthView: ({ occurrences }: { occurrences: Array<{ occurrenceId: string }> }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{`Month calendar:${occurrences.length}`}</ReactNative.Text>;
  },
}));

jest.mock('@/app/navigation/MainTabScreenLayout', () => ({
  MainTabScreenLayout: ({ children }: React.PropsWithChildren) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

jest.mock('@/app/navigation/HeaderIconButton', () => ({
  HeaderIconButton: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress?: () => void }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{accessibilityLabel}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
}));

jest.mock('@/components/skeleton/SkeletonBlock', () => ({
  SkeletonBlock: () => null,
}));

jest.mock('@/components/skeleton/EventCardSkeleton', () => ({
  EventCardSkeleton: () => null,
}));

const baseListEvents = [
  {
    occurrenceId: 'occ-1',
    eventSeries: {
      eventId: 'event-1',
      title: 'Signal Studios Urban Maker Fair',
      summary: 'A maker market',
      description: 'A maker market',
      organization: { name: 'Signal Studios' },
      location: { address: { city: 'Cape Town', state: 'Western Cape' } },
      eventCategories: [{ name: 'Markets' }],
    },
  },
];

const baseFilters = {
  categories: [],
  statuses: [],
  dateOption: null,
  location: { city: '', state: '', country: '' },
};

describe('EventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseEventsFilters.mockReturnValue({
      appliedFilters: baseFilters,
      draftFilters: baseFilters,
      sheetVisible: false,
      isHydrated: true,
      openSheet: mockOpenSheet,
      closeSheet: jest.fn(),
      applyFilters: jest.fn(),
      clearAllFilters: jest.fn(),
      toggleDraftCategory: jest.fn(),
      toggleDraftStatus: jest.fn(),
      setDraftDateOption: jest.fn(),
      setDraftLocation: jest.fn(),
      clearDraftLocation: jest.fn(),
      removeAppliedDateOption: jest.fn(),
      removeAppliedCategory: jest.fn(),
      removeAppliedStatus: jest.fn(),
      removeAppliedLocation: jest.fn(),
    });

    mockUseFilteredMobileEvents.mockReturnValue({
      categories: [],
      error: null,
      events: baseListEvents,
      hasMore: false,
      isFetchingMore: false,
      loadMore: jest.fn(),
      loading: false,
      refetch: jest.fn(),
      totalEvents: 1,
    });

    mockUseOccurrenceCalendarEvents.mockReturnValue({
      categories: [],
      error: null,
      events: [
        ...baseListEvents,
        {
          ...baseListEvents[0],
          occurrenceId: 'occ-2',
          eventSeries: { ...baseListEvents[0].eventSeries, title: 'Wednesday Coffee & Code' },
        },
      ],
      loading: false,
      refetch: jest.fn(),
      totalEvents: 2,
    });
  });

  it('renders list view by default and keeps the date filter visible in the sheet', () => {
    render(<EventsScreen />);

    expect(screen.getByText('Current view:list')).toBeTruthy();
    expect(screen.getByText('1 Events Found')).toBeTruthy();
    expect(screen.getByText('Signal Studios Urban Maker Fair')).toBeTruthy();
    expect(screen.getByText('Date filter visible')).toBeTruthy();
  });

  it('switches to week view, hides the date filter, and renders the calendar surface', () => {
    render(<EventsScreen />);

    fireEvent.press(screen.getByText('Week'));

    expect(screen.getByText('Current view:week')).toBeTruthy();
    expect(screen.getByText('week navigator')).toBeTruthy();
    expect(screen.getByText('2 occurrences in this week')).toBeTruthy();
    expect(screen.getByText('Week calendar:2')).toBeTruthy();
    expect(screen.getByText('Date filter hidden')).toBeTruthy();
  });

  it('switches to month view and renders the month calendar surface', () => {
    render(<EventsScreen />);

    fireEvent.press(screen.getByText('Month'));

    expect(screen.getByText('Current view:month')).toBeTruthy();
    expect(screen.getByText('month navigator')).toBeTruthy();
    expect(screen.queryByText('2 occurrences in this month')).toBeNull();
    expect(screen.getByText('Month calendar:2')).toBeTruthy();
  });
});
