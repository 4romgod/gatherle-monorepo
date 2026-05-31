import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { UserHostedEventsScreen } from '@/screens/users/UserHostedEventsScreen';

const mockNavigate = jest.fn();
const mockUseHostedEventsByUser = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({
    params: {
      displayName: 'Jeff Bezos',
      totalCount: 6,
      userId: 'user-1',
      username: 'jeffbez',
    },
  }),
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
        textSecondary: '#64748b',
      },
    },
  }),
}));

jest.mock('@/hooks/events/useHostedEventsByUser', () => ({
  useHostedEventsByUser: (...args: unknown[]) => mockUseHostedEventsByUser(...args),
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

jest.mock('@/components/core/PageContainer', () => ({
  PageContainer: ({ children }: React.PropsWithChildren) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

jest.mock('@/components/core/PageHeading', () => ({
  PageHeading: ({ title, subtitle }: { title: string; subtitle?: string }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        {subtitle ? <ReactNative.Text>{subtitle}</ReactNative.Text> : null}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/SearchField', () => ({
  SearchField: ({
    onChangeText,
    onClear,
    placeholder,
    value,
  }: {
    onChangeText: (value: string) => void;
    onClear?: () => void;
    placeholder: string;
    value: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.TextInput accessibilityLabel={placeholder} onChangeText={onChangeText} value={value} />
        {value.length > 0 && onClear ? (
          <ReactNative.Pressable onPress={onClear}>
            <ReactNative.Text>Clear search</ReactNative.Text>
          </ReactNative.Pressable>
        ) : null}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/StateNotice', () => ({
  StateNotice: ({ message }: { message: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{message}</ReactNative.Text>;
  },
}));

jest.mock('@/components/account/ProfileEventsEmptyState', () => ({
  ProfileEventsEmptyState: ({
    title,
    description,
    ctaLabel,
    onPressCta,
  }: {
    title: string;
    description: string;
    ctaLabel: string;
    onPressCta?: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        <ReactNative.Text>{description}</ReactNative.Text>
        <ReactNative.Pressable onPress={onPressCta}>
          <ReactNative.Text>{ctaLabel}</ReactNative.Text>
        </ReactNative.Pressable>
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/events/EventTileGrid', () => ({
  EventTileGrid: ({
    occurrences,
    onPressEvent,
  }: {
    occurrences: Array<{ eventSeries?: { title?: string | null } }>;
    onPressEvent?: (occurrence: unknown) => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        {occurrences.map((occurrence, index) => (
          <ReactNative.Text
            key={`${occurrence.eventSeries?.title ?? 'event'}-${index}`}
            onPress={() => onPressEvent?.(occurrence)}
          >
            {occurrence.eventSeries?.title ?? 'Hosted event'}
          </ReactNative.Text>
        ))}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/skeleton/EventTileGridSkeleton', () => ({
  EventTileGridSkeleton: () => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>Hosted events loading</ReactNative.Text>;
  },
}));

describe('UserHostedEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostedEventsByUser.mockImplementation(
      (_userId: string, _authToken: string, options?: { searchTerm?: string }) => {
        const searchTerm = options?.searchTerm ?? '';
        const isSearching = searchTerm.trim().toLowerCase() === 'cape';
        return {
          error: null,
          hasMore: false,
          hostedEvents: isSearching
            ? []
            : [
                {
                  occurrenceId: 'occ-1',
                  eventSeries: { title: 'Veld Wellness Immersion' },
                },
              ],
          loading: false,
          loadingMore: false,
          loadMore: jest.fn(),
          refetch: jest.fn(),
          totalCount: 6,
        };
      },
    );
  });

  it('passes hosted event search through to the hosted events query', () => {
    render(<UserHostedEventsScreen />);

    fireEvent.changeText(screen.getByLabelText('Search hosted events'), 'Cape');

    expect(mockUseHostedEventsByUser).toHaveBeenLastCalledWith('user-1', 'token', { searchTerm: 'Cape' });
    expect(screen.getByText('No hosted events match that search')).toBeTruthy();
  });

  it('opens hosted event tiles through the standard event details flow', () => {
    render(<UserHostedEventsScreen />);

    fireEvent.press(screen.getByText('Veld Wellness Immersion'));

    expect(mockNavigate).toHaveBeenCalledWith('EventDetails', {
      occurrence: expect.objectContaining({
        occurrenceId: 'occ-1',
      }),
    });
  });
});
