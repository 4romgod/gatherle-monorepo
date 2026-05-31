import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, TextInput, View } from 'react-native';
import { AdminEventsScreen } from '@/screens/admin/AdminEventsScreen';

const mockNavigate = jest.fn();
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseAdminAccess = jest.fn();
const mockShowToast = jest.fn();
const mockDeleteEvent = jest.fn();
const mockUpdateEvent = jest.fn();
const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
let infiniteScrollConfig: Record<string, unknown> | null = null;

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

jest.mock('@data/graphql/mutation/Event/mutation', () => ({
  DeleteEventByIdDocument: 'DeleteEventByIdDocument',
  UpdateEventDocument: 'UpdateEventDocument',
}));

jest.mock('@data/graphql/query/Event/query', () => ({
  GetEventsDocument: 'GetEventsDocument',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/hooks/admin/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

jest.mock('@/hooks/core/usePullToRefresh', () => ({
  usePullToRefresh: (refreshFn: () => Promise<unknown>) => ({ onRefresh: refreshFn, refreshing: false }),
}));

jest.mock('@/hooks/core/useInfiniteScroll', () => ({
  useInfiniteScroll: (config: Record<string, unknown>) => {
    infiniteScrollConfig = config;
    return {
      onContentSizeChange: jest.fn(),
      onScroll: jest.fn(),
      scrollEventThrottle: 16,
    };
  },
}));

jest.mock('@/lib/auth', () => ({
  getApolloAuthContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/events/formatters', () => ({
  formatShortDateTime: jest.fn(() => 'Fri 29 May'),
}));

jest.mock('@/app/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/core/PageContainer', () => ({
  PageContainer: ({ children, onRefresh }: React.PropsWithChildren<{ onRefresh?: () => void }>) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        {onRefresh ? (
          <ReactNative.Pressable onPress={onRefresh}>
            <ReactNative.Text>Refresh page</ReactNative.Text>
          </ReactNative.Pressable>
        ) : null}
        {children}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/SearchField', () => ({
  SearchField: ({
    placeholder,
    value,
    onChangeText,
    onClear,
  }: {
    placeholder?: string;
    value?: string;
    onChangeText?: (value: string) => void;
    onClear?: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} />
        <ReactNative.Pressable onPress={onClear}>
          <ReactNative.Text>Clear search</ReactNative.Text>
        </ReactNative.Pressable>
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/SectionHeading', () => ({
  SectionHeading: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/core/StateNotice', () => ({
  StateNotice: ({
    message,
    actionLabel,
    onPressAction,
  }: {
    message: string;
    actionLabel?: string;
    onPressAction?: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{message}</ReactNative.Text>
        {actionLabel ? (
          <ReactNative.Pressable onPress={onPressAction}>
            <ReactNative.Text>{actionLabel}</ReactNative.Text>
          </ReactNative.Pressable>
        ) : null}
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

jest.mock('@/components/core/InlineButton', () => ({
  InlineButton: ({ label, onPress }: { label: string; onPress?: () => void }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{label}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
}));

jest.mock('@/components/admin/AdminEntityCard', () => ({
  AdminEntityCard: ({
    title,
    subtitle,
    description,
    meta,
    actions,
    children,
  }: {
    title: string;
    subtitle?: string | null;
    description?: string | null;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        {subtitle ? <ReactNative.Text>{subtitle}</ReactNative.Text> : null}
        {description ? <ReactNative.Text>{description}</ReactNative.Text> : null}
        {meta}
        {actions}
        {children}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/admin/AdminListFooter', () => ({
  AdminListFooter: ({ label, loadedCount }: { label: string; loadedCount: number }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{`${loadedCount} ${label}`}</ReactNative.Text>;
  },
}));

jest.mock('@/components/admin/AdminModal', () => ({
  AdminModal: ({
    title,
    visible,
    children,
    footer,
  }: {
    title: string;
    visible: boolean;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) => {
    const ReactNative = require('react-native');
    if (!visible) return null;
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        {children}
        {footer}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/admin/AdminPill', () => ({
  AdminPill: ({ label }: { label: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{label}</ReactNative.Text>;
  },
}));

describe('AdminEventsScreen', () => {
  const refetch = jest.fn();
  const fetchMore = jest.fn();
  const refetchAdminAccess = jest.fn();
  const buildEvent = (index: number) => ({
    eventId: `event-${index}`,
    title: `Event ${index}`,
    summary: 'Multi-day wellness event',
    status: 'Ongoing',
    lifecycleStatus: 'Published',
    visibility: 'Public',
    rsvpCount: 4,
    savedByCount: 3,
    representativeOccurrence: { startAt: '2026-05-29T08:00:00.000Z' },
    organization: { name: 'Wellness Org' },
    location: { address: { city: 'Cape Town', country: 'South Africa' } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    infiniteScrollConfig = null;
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseAdminAccess.mockReset();
    mockDeleteEvent.mockResolvedValue({ data: { deleteEventById: true } });
    mockUpdateEvent.mockResolvedValue({ data: { updateEvent: { eventId: 'event-1' } } });
    mockUseMutation.mockImplementation((document: string) => {
      if (document === 'DeleteEventByIdDocument') return [mockDeleteEvent, { loading: false }];
      if (document === 'UpdateEventDocument') return [mockUpdateEvent, { loading: false }];
      return [jest.fn(), { loading: false }];
    });
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: refetchAdminAccess,
    });
    mockUseQuery.mockReturnValue({
      data: {
        readEvents: [
          {
            ...buildEvent(1),
            title: 'Cape Town Wellness Immersion',
          },
        ],
      },
      loading: false,
      error: null,
      refetch,
      fetchMore,
    });
  });

  it('shows the unauthenticated guard copy', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: null,
      isAdmin: false,
      isAuthenticated: false,
      loading: false,
      refetch: refetchAdminAccess,
    });

    render(<AdminEventsScreen />);

    expect(screen.getByText('Sign in with a Gatherle admin account to moderate events.')).toBeTruthy();
  });

  it('navigates to the sessions drill-down for an event', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: refetchAdminAccess,
    });

    render(<AdminEventsScreen />);

    fireEvent.press(screen.getByText('Sessions'));

    expect(mockNavigate).toHaveBeenCalledWith('AdminEventSessions', {
      eventId: 'event-1',
      title: 'Cape Town Wellness Immersion',
    });
  });

  it('opens the moderation modal from the edit action', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: refetchAdminAccess,
    });

    render(<AdminEventsScreen />);

    fireEvent.press(screen.getByText('Edit'));

    expect(screen.getByText('Moderate Cape Town Wellness Immersion')).toBeTruthy();
    expect(screen.getByText('Save moderation')).toBeTruthy();
  });

  it('shows the loading and permission states for non-admin users', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: false,
      isAuthenticated: true,
      loading: true,
      refetch: refetchAdminAccess,
    });

    const loadingView = render(<AdminEventsScreen />);
    expect(loadingView.getByText('Checking your admin access...')).toBeTruthy();
    loadingView.unmount();

    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: false,
      isAuthenticated: true,
      loading: false,
      refetch: refetchAdminAccess,
    });

    render(<AdminEventsScreen />);
    expect(screen.getByText('Only Gatherle admins can access event moderation.')).toBeTruthy();
  });

  it('renders the retry state when the events query errors before data loads', () => {
    mockUseQuery.mockReturnValue({
      data: { readEvents: [] },
      loading: false,
      error: new Error('nope'),
      refetch,
      fetchMore,
    });

    render(<AdminEventsScreen />);
    expect(screen.getByText('We couldn’t load events.')).toBeTruthy();
  });

  it('retries the event query from the error state', async () => {
    mockUseQuery.mockReturnValue({
      data: { readEvents: [] },
      loading: false,
      error: new Error('nope'),
      refetch,
      fetchMore,
    });

    render(<AdminEventsScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    expect(refetchAdminAccess).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalledWith({
      options: expect.objectContaining({
        pagination: { limit: 12, skip: 0 },
      }),
    });
  });

  it('shows the default empty state when there are no events', () => {
    mockUseQuery.mockReturnValue({
      data: { readEvents: [] },
      loading: false,
      error: null,
      refetch,
      fetchMore,
    });

    render(<AdminEventsScreen />);

    expect(screen.getByText('No events available for moderation yet.')).toBeTruthy();
  });

  it('debounces search and shows the matching empty state when nothing is found', async () => {
    jest.useFakeTimers();
    mockUseQuery.mockReturnValue({
      data: { readEvents: [] },
      loading: false,
      error: null,
      refetch,
      fetchMore,
    });

    render(<AdminEventsScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Search title, slug, location, category, or org'), 'Cape');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('No matching events for that search.')).toBeTruthy();
    });
    expect(mockUseQuery.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({
        variables: expect.objectContaining({
          options: expect.objectContaining({
            search: expect.objectContaining({ value: 'Cape' }),
          }),
        }),
      }),
    );

    jest.useRealTimers();
  });

  it('updates query filters when a queue chip is pressed', async () => {
    render(<AdminEventsScreen />);

    fireEvent.press(screen.getByText('Cancelled'));

    await waitFor(() => {
      expect(mockUseQuery.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({
          variables: expect.objectContaining({
            options: expect.objectContaining({
              filters: [{ field: 'status', value: 'Cancelled' }],
            }),
          }),
        }),
      );
    });
  });

  it('saves moderation changes through the modal', async () => {
    render(<AdminEventsScreen />);
    fireEvent.press(screen.getByText('Edit'));
    await act(async () => {
      fireEvent.press(screen.getByText('Save moderation'));
    });

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: 'event-1',
            lifecycleStatus: 'Published',
            status: 'Ongoing',
            visibility: 'Public',
          },
        },
      });
    });
  });

  it('updates status, lifecycle, and visibility before saving moderation', async () => {
    render(<AdminEventsScreen />);
    fireEvent.press(screen.getByText('Edit'));
    fireEvent.press(screen.getAllByText('Cancelled')[1]);
    fireEvent.press(screen.getByText('Draft'));
    fireEvent.press(screen.getByText('Private'));

    await act(async () => {
      fireEvent.press(screen.getByText('Save moderation'));
    });

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: 'event-1',
            lifecycleStatus: 'Draft',
            status: 'Cancelled',
            visibility: 'Private',
          },
        },
      });
    });
  });

  it('shows a toast when saving moderation fails', async () => {
    mockUpdateEvent.mockRejectedValueOnce(new Error('save failed'));

    render(<AdminEventsScreen />);
    fireEvent.press(screen.getByText('Edit'));

    await act(async () => {
      fireEvent.press(screen.getByText('Save moderation'));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'save failed',
        tone: 'error',
      });
    });
  });

  it('deletes an event after confirming the native alert flow', async () => {
    render(<AdminEventsScreen />);
    fireEvent.press(screen.getByText('Delete'));

    expect(alertSpy).toHaveBeenCalled();
    const [, , actions] = alertSpy.mock.calls[0] as [string, string, Array<{ text: string; onPress?: () => void }>];
    const destructiveAction = actions.find((action) => action.text === 'Delete');
    await act(async () => {
      destructiveAction?.onPress?.();
    });

    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith({ variables: { eventId: 'event-1' } });
    });
  });

  it('shows a toast when event deletion fails', async () => {
    mockDeleteEvent.mockRejectedValueOnce(new Error('delete failed'));

    render(<AdminEventsScreen />);
    fireEvent.press(screen.getByText('Delete'));

    const [, , actions] = alertSpy.mock.calls[0] as [string, string, Array<{ text: string; onPress?: () => void }>];
    const destructiveAction = actions.find((action) => action.text === 'Delete');
    await act(async () => {
      destructiveAction?.onPress?.();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'delete failed',
        tone: 'error',
      });
    });
  });

  it('shows a toast when loading more events fails', async () => {
    fetchMore.mockRejectedValueOnce(new Error('load more failed'));
    mockUseQuery.mockReturnValue({
      data: {
        readEvents: Array.from({ length: 12 }, (_, index) => buildEvent(index + 1)),
      },
      loading: false,
      error: null,
      refetch,
      fetchMore,
    });

    render(<AdminEventsScreen />);

    await act(async () => {
      await (infiniteScrollConfig?.onEndReached as (() => Promise<void>) | undefined)?.();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'load more failed',
        tone: 'error',
      });
    });
  });
});
