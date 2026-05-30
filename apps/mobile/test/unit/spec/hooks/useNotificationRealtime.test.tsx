import { act, renderHook } from '@testing-library/react-native';
import { useNotificationRealtime } from '@/hooks/notifications/useNotificationRealtime';

const mockUseApolloClient = jest.fn();
const mockUseAppShell = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockUseApolloClient(),
}));

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => mockUseAppShell(),
}));

const mockAddSharedRealtimeSubscriber = jest.fn(() => 1);
const mockRemoveSharedRealtimeSubscriber = jest.fn();
const mockUpdateSharedRealtimeSubscriber = jest.fn();
const mockRefreshSharedRealtimeConnection = jest.fn();
const mockGetSharedRealtimeConnectionState = jest.fn(() => false);
const mockSendSharedRealtimeAction = jest.fn();

jest.mock('@/lib/realtime/sharedRealtimeConnectionManager', () => ({
  addSharedRealtimeSubscriber: (...args: unknown[]) => mockAddSharedRealtimeSubscriber(...args),
  removeSharedRealtimeSubscriber: (...args: unknown[]) => mockRemoveSharedRealtimeSubscriber(...args),
  updateSharedRealtimeSubscriber: (...args: unknown[]) => mockUpdateSharedRealtimeSubscriber(...args),
  refreshSharedRealtimeConnection: (...args: unknown[]) => mockRefreshSharedRealtimeConnection(...args),
  getSharedRealtimeConnectionState: () => mockGetSharedRealtimeConnectionState(),
  sendSharedRealtimeAction: (...args: unknown[]) => mockSendSharedRealtimeAction(...args),
}));

jest.mock('@/lib/realtime/websocket', () => ({
  resolveMobileWebsocketBaseUrl: () => ({
    websocketBaseUrl: 'ws://localhost:3001',
    websocketSource: 'explicit',
  }),
}));

const mockCacheHandlers = {
  handleRealtimeEventRsvp: jest.fn(),
  handleRealtimeFollowRequest: jest.fn(),
  handleRealtimeNotification: jest.fn(),
  handleRealtimeNotificationDeleted: jest.fn(),
  handleRealtimeNotificationsAllRead: jest.fn(),
};

jest.mock('@/lib/notifications/notificationRealtimeCache', () => ({
  createMobileNotificationRealtimeCacheHandlers: jest.fn(() => mockCacheHandlers),
}));

const validRsvpPayload = {
  participant: {
    participantId: 'participant-1',
    eventId: 'event-1',
    occurrenceId: 'occurrence-1',
    occurrenceKey: 'event-1:2026-05-26T10:00:00.000Z',
    userId: 'user-1',
    status: 'Going',
    quantity: 1,
    sharedVisibility: 'Public',
    rsvpAt: '2026-05-26T10:00:00.000Z',
    cancelledAt: null,
    checkedInAt: null,
    user: {
      userId: 'user-1',
      username: 'alice',
      given_name: 'Alice',
      family_name: 'Smith',
      profile_picture: null,
    },
  },
  previousStatus: null,
  rsvpCount: 3,
};

describe('useNotificationRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApolloClient.mockReturnValue({ cache: {} });
    mockUseAppShell.mockReturnValue({
      authToken: 'token-1',
      userId: 'user-1',
    });
  });

  it('registers a subscriber and removes it on unmount', () => {
    const { unmount } = renderHook(() => useNotificationRealtime(true));

    expect(mockAddSharedRealtimeSubscriber).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(mockRefreshSharedRealtimeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-1',
        userId: 'user-1',
      }),
    );

    unmount();

    expect(mockRemoveSharedRealtimeSubscriber).toHaveBeenCalledWith(1);
  });

  it('dispatches event.rsvp.updated messages to the RSVP cache handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSharedRealtimeSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'event.rsvp.updated', payload: validRsvpPayload }));
    });

    expect(mockCacheHandlers.handleRealtimeEventRsvp).toHaveBeenCalledWith(validRsvpPayload);
  });
});
