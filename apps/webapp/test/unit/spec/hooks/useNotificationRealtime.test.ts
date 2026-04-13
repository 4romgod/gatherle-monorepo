import { act, renderHook } from '@testing-library/react';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime/useNotificationRealtime';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@/lib/constants', () => ({
  WEBSOCKET_URL: 'ws://localhost:3001',
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  normalizeWebSocketBaseUrl: jest.fn((url: string) => url || null),
  isRecord: (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v),
}));

const mockAddSubscriber = jest.fn(() => 1);
const mockRemoveSubscriber = jest.fn();
const mockUpdateSubscriber = jest.fn();
const mockRefreshConnection = jest.fn();
const mockGetConnectionState = jest.fn(() => false);
const mockSendAction = jest.fn(() => true);

jest.mock('@/lib/utils/realtime', () => ({
  addSharedRealtimeSubscriber: (...args: unknown[]) => mockAddSubscriber(...args),
  removeSharedRealtimeSubscriber: (...args: unknown[]) => mockRemoveSubscriber(...args),
  updateSharedRealtimeSubscriber: (...args: unknown[]) => mockUpdateSubscriber(...args),
  refreshSharedRealtimeConnection: (...args: unknown[]) => mockRefreshConnection(...args),
  getSharedRealtimeConnectionState: () => mockGetConnectionState(),
  sendSharedRealtimeAction: (...args: unknown[]) => mockSendAction(...args),
}));

const mockCacheHandlers = {
  handleRealtimeEventRsvp: jest.fn(),
  handleRealtimeFollowRequest: jest.fn(),
  handleRealtimeNotification: jest.fn(),
};

jest.mock('@/hooks/useNotificationRealtime/notificationRealtimeCache', () => ({
  createNotificationRealtimeCacheHandlers: jest.fn(() => mockCacheHandlers),
}));

const {
  createNotificationRealtimeCacheHandlers: createHandlersMock,
} = require('@/hooks/useNotificationRealtime/notificationRealtimeCache');

const mockApolloClient = { cache: {} };

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(() => mockApolloClient),
}));

// Minimal valid payloads for protocol type guards
const validNotificationPayload = {
  notification: {
    notificationId: 'notif-1',
    recipientUserId: 'user-1',
    type: 'follow',
    title: 'New follower',
    message: 'Alice followed you',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  unreadCount: 3,
};

const validFollowRequestPayload = {
  follow: {
    followId: 'follow-1',
    followerUserId: 'user-2',
    targetType: 'User',
    targetId: 'user-1',
    approvalStatus: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    follower: {
      userId: 'user-2',
      username: 'alice',
      email: 'alice@example.com',
      given_name: 'Alice',
      family_name: 'Smith',
      profile_picture: null,
      bio: null,
    },
  },
};

const validRsvpPayload = {
  participant: {
    participantId: 'part-1',
    eventId: 'event-1',
    userId: 'user-2',
    status: 'Going',
    quantity: 1,
    sharedVisibility: null,
    rsvpAt: new Date().toISOString(),
    cancelledAt: null,
    checkedInAt: null,
    user: {
      userId: 'user-2',
      username: 'alice',
      given_name: 'Alice',
      family_name: 'Smith',
      profile_picture: null,
    },
  },
  previousStatus: null,
  rsvpCount: 4,
};

describe('useNotificationRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { token: 'tok-1', userId: 'user-1' } },
    });
    mockGetConnectionState.mockReturnValue(false);
    mockAddSubscriber.mockReturnValue(55);
    // Reset logger mock call counts
    const { logger } = require('@/lib/utils');
    Object.values(logger as Record<string, jest.Mock>).forEach((fn) => (fn as jest.Mock).mockClear?.());
  });

  it('registers a subscriber on mount and removes it on unmount', () => {
    const { unmount } = renderHook(() => useNotificationRealtime(true));

    expect(mockAddSubscriber).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));

    unmount();

    expect(mockRemoveSubscriber).toHaveBeenCalledWith(55);
  });

  it('calls refreshSharedRealtimeConnection on mount', () => {
    renderHook(() => useNotificationRealtime(true));

    expect(mockRefreshConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'tok-1',
        userId: 'user-1',
      }),
    );
  });

  it('sends notification.subscribe when already connected on mount', () => {
    mockGetConnectionState.mockReturnValue(true);

    renderHook(() => useNotificationRealtime(true));

    expect(mockSendAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.subscribe' }));
  });

  it('does not send subscribe when not connected on mount', () => {
    mockGetConnectionState.mockReturnValue(false);

    renderHook(() => useNotificationRealtime(true));

    expect(mockSendAction).not.toHaveBeenCalled();
  });

  it('sends subscribe via onOpen when connection opens', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onOpen?.();
    });

    expect(mockSendAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.subscribe' }));
  });

  it('dispatches notification.new event to cache handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'notification.new', payload: validNotificationPayload }));
    });

    expect(mockCacheHandlers.handleRealtimeNotification).toHaveBeenCalledWith(validNotificationPayload);
  });

  it('dispatches follow.request.created event to follow request handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(
        JSON.stringify({ type: 'follow.request.created', payload: validFollowRequestPayload }),
      );
    });

    expect(mockCacheHandlers.handleRealtimeFollowRequest).toHaveBeenCalledWith(validFollowRequestPayload);
  });

  it('dispatches follow.request.updated event to follow request handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(
        JSON.stringify({ type: 'follow.request.updated', payload: validFollowRequestPayload }),
      );
    });

    expect(mockCacheHandlers.handleRealtimeFollowRequest).toHaveBeenCalledWith(validFollowRequestPayload);
  });

  it('dispatches event.rsvp.updated event to rsvp handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'event.rsvp.updated', payload: validRsvpPayload }));
    });

    expect(mockCacheHandlers.handleRealtimeEventRsvp).toHaveBeenCalledWith(validRsvpPayload);
  });

  it('ignores malformed JSON', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage('not-json{{{');
    });

    expect(mockCacheHandlers.handleRealtimeNotification).not.toHaveBeenCalled();
  });

  it('ignores messages with unknown type', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'unknown.type', payload: {} }));
    });

    expect(mockCacheHandlers.handleRealtimeNotification).not.toHaveBeenCalled();
    expect(mockCacheHandlers.handleRealtimeFollowRequest).not.toHaveBeenCalled();
    expect(mockCacheHandlers.handleRealtimeEventRsvp).not.toHaveBeenCalled();
  });

  it('logs warning when notification realtime disabled because session user is missing', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'tok-1', userId: null } } });

    renderHook(() => useNotificationRealtime(true));

    const { logger } = require('@/lib/utils');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('session user is missing'));
  });

  it('logs error when websocket URL is not configured', () => {
    const { normalizeWebSocketBaseUrl, logger } = require('@/lib/utils');
    (normalizeWebSocketBaseUrl as jest.Mock).mockReturnValueOnce(null);

    renderHook(() => useNotificationRealtime(true));

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('websocket URL is not configured'),
      expect.any(Object),
    );
  });

  it('does not create cache handlers when userId is absent', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'tok-1', userId: null } } });

    renderHook(() => useNotificationRealtime(true));

    expect(createHandlersMock).not.toHaveBeenCalled();
  });

  it('creates cache handlers when userId is present', () => {
    renderHook(() => useNotificationRealtime(true));

    expect(createHandlersMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('updates subscriber & refreshes when enabled changes', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useNotificationRealtime(enabled), {
      initialProps: { enabled: true },
    });

    act(() => {
      rerender({ enabled: false });
    });

    expect(mockUpdateSubscriber).toHaveBeenCalledWith(55, expect.objectContaining({ enabled: false }));
  });

  it('sends malformed payload warning for invalid notification', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'notification.new', payload: { bad: 'data' } }));
    });

    const { logger } = require('@/lib/utils');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed'));
  });

  it('warns when malformed follow request payload received', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'follow.request.created', payload: { bad: 'data' } }));
    });

    const { logger } = require('@/lib/utils');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed follow request'));
  });

  it('warns when malformed RSVP payload received', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'event.rsvp.updated', payload: { bad: 'data' } }));
    });

    const { logger } = require('@/lib/utils');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed event RSVP'));
  });

  it('logs warning when sendSharedRealtimeAction fails to send subscribe', () => {
    mockSendAction.mockReturnValueOnce(false);
    mockGetConnectionState.mockReturnValue(true);

    renderHook(() => useNotificationRealtime(true));

    const { logger } = require('@/lib/utils');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to send notification subscription'));
  });

  it('sends subscribe on enabled-change when already connected', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useNotificationRealtime(enabled), {
      initialProps: { enabled: false },
    });

    jest.clearAllMocks();
    mockGetConnectionState.mockReturnValue(true);
    mockAddSubscriber.mockReturnValue(55);

    act(() => {
      rerender({ enabled: true });
    });

    expect(mockSendAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.subscribe' }));
  });
});
