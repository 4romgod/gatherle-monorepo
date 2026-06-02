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
  handleRealtimeEventSave: jest.fn(),
  handleRealtimeEventRsvp: jest.fn(),
  handleRealtimeFollowRequest: jest.fn(),
  handleRealtimeMomentCreated: jest.fn(),
  handleRealtimeMomentDeleted: jest.fn(),
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

const validEventSavePayload = {
  eventId: 'event-1',
  isSaved: true,
  followId: 'follow-1',
};

const validMomentCreatedPayload = {
  moment: {
    momentId: 'moment-1',
    eventId: 'event-1',
    occurrenceId: 'occurrence-1',
    authorId: 'user-1',
    type: 'text',
    state: 'Ready',
    caption: null,
    mediaUrl: null,
    thumbnailUrl: null,
    imageDisplayMode: null,
    background: null,
    durationSeconds: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    author: {
      userId: 'user-1',
      username: 'alice',
      given_name: 'Alice',
      family_name: 'Smith',
      profile_picture: null,
    },
    event: {
      eventId: 'event-1',
      slug: 'event-1',
      title: 'Event 1',
    },
  },
};

const validMomentDeletedPayload = {
  momentId: 'moment-1',
  eventId: 'event-1',
  occurrenceId: 'occurrence-1',
  authorId: 'user-1',
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

  it('dispatches event.save.updated messages to the event save handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSharedRealtimeSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'event.save.updated', payload: validEventSavePayload }));
    });

    expect(mockCacheHandlers.handleRealtimeEventSave).toHaveBeenCalledWith(validEventSavePayload);
  });

  it('dispatches moment.created messages to the moment created handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSharedRealtimeSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'moment.created', payload: validMomentCreatedPayload }));
    });

    expect(mockCacheHandlers.handleRealtimeMomentCreated).toHaveBeenCalledWith(validMomentCreatedPayload);
  });

  it('dispatches moment.deleted messages to the moment deleted handler', () => {
    renderHook(() => useNotificationRealtime(true));

    const subscriberConfig = mockAddSharedRealtimeSubscriber.mock.calls[0][0];

    act(() => {
      subscriberConfig.onMessage(JSON.stringify({ type: 'moment.deleted', payload: validMomentDeletedPayload }));
    });

    expect(mockCacheHandlers.handleRealtimeMomentDeleted).toHaveBeenCalledWith(validMomentDeletedPayload);
  });
});
