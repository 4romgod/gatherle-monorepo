import { act, renderHook } from '@testing-library/react';
import { useChatRealtime } from '@/hooks/useChatRealtime/useChatRealtime';
import type {
  ChatMessageRealtimePayload,
  ChatReadRealtimePayload,
  ChatConversationUpdatedRealtimePayload,
} from '@/hooks/useChatRealtime/useChatRealtime';

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

describe('useChatRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { token: 'tok-1', userId: 'user-1' } },
    });
    mockGetConnectionState.mockReturnValue(false);
    mockAddSubscriber.mockReturnValue(42);
  });

  it('registers a subscriber on mount and removes it on unmount', () => {
    const { unmount } = renderHook(() => useChatRealtime());

    expect(mockAddSubscriber).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));

    unmount();

    expect(mockRemoveSubscriber).toHaveBeenCalledWith(42);
  });

  it('calls refreshSharedRealtimeConnection on mount', () => {
    renderHook(() => useChatRealtime());

    expect(mockRefreshConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'tok-1',
        userId: 'user-1',
        websocketBaseUrl: 'ws://localhost:3001',
        websocketSource: 'explicit',
      }),
    );
  });

  it('returns current connection state', () => {
    mockGetConnectionState.mockReturnValue(true);

    const { result } = renderHook(() => useChatRealtime());

    expect(result.current.isConnected).toBe(true);
  });

  it('reflects disabled state via enabled=false option', () => {
    renderHook(() => useChatRealtime({ enabled: false }));

    expect(mockAddSubscriber).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('updates subscriber when enabled changes', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useChatRealtime({ enabled }), {
      initialProps: { enabled: true },
    });

    act(() => {
      rerender({ enabled: false });
    });

    expect(mockUpdateSubscriber).toHaveBeenCalledWith(42, expect.objectContaining({ enabled: false }));
  });

  it('sendChatMessage calls sendSharedRealtimeAction with correct payload', () => {
    const { result } = renderHook(() => useChatRealtime());

    act(() => {
      result.current.sendChatMessage('recipient-1', 'Hello!');
    });

    expect(mockSendAction).toHaveBeenCalledWith({
      action: 'chat.send',
      recipientUserId: 'recipient-1',
      message: 'Hello!',
    });
  });

  it('markConversationRead calls sendSharedRealtimeAction with correct payload', () => {
    const { result } = renderHook(() => useChatRealtime());

    act(() => {
      result.current.markConversationRead('user-2');
    });

    expect(mockSendAction).toHaveBeenCalledWith({
      action: 'chat.read',
      withUserId: 'user-2',
    });
  });

  it('invokes onChatMessage callback when a chat.message event is received', () => {
    const onChatMessage = jest.fn();
    renderHook(() => useChatRealtime({ onChatMessage }));

    const addedSubscriber = mockAddSubscriber.mock.calls[0][0];
    const onMessageFn = addedSubscriber.onMessage;

    const payload: ChatMessageRealtimePayload = {
      messageId: 'msg-1',
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'Hi',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    act(() => {
      onMessageFn(JSON.stringify({ type: 'chat.message', payload }));
    });

    expect(onChatMessage).toHaveBeenCalledWith(payload);
  });

  it('invokes onChatRead callback when a chat.read event is received', () => {
    const onChatRead = jest.fn();
    renderHook(() => useChatRealtime({ onChatRead }));

    const addedSubscriber = mockAddSubscriber.mock.calls[0][0];

    const payload: ChatReadRealtimePayload = {
      readerUserId: 'user-1',
      withUserId: 'user-2',
      markedCount: 3,
      readAt: new Date().toISOString(),
    };

    act(() => {
      addedSubscriber.onMessage(JSON.stringify({ type: 'chat.read', payload }));
    });

    expect(onChatRead).toHaveBeenCalledWith(payload);
  });

  it('invokes onChatConversationUpdated callback correctly', () => {
    const onChatConversationUpdated = jest.fn();
    renderHook(() => useChatRealtime({ onChatConversationUpdated }));

    const addedSubscriber = mockAddSubscriber.mock.calls[0][0];

    const payload: ChatConversationUpdatedRealtimePayload = {
      conversationWithUserId: 'user-2',
      unreadCount: 1,
      unreadTotal: 5,
      reason: 'chat.send',
      updatedAt: new Date().toISOString(),
      lastMessage: null,
    };

    act(() => {
      addedSubscriber.onMessage(JSON.stringify({ type: 'chat.conversation.updated', payload }));
    });

    expect(onChatConversationUpdated).toHaveBeenCalledWith(payload);
  });

  it('ignores malformed JSON messages', () => {
    const onChatMessage = jest.fn();
    renderHook(() => useChatRealtime({ onChatMessage }));

    const addedSubscriber = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      addedSubscriber.onMessage('not-valid-json{{{');
    });

    expect(onChatMessage).not.toHaveBeenCalled();
  });

  it('ignores messages with unknown event type', () => {
    const onChatMessage = jest.fn();
    renderHook(() => useChatRealtime({ onChatMessage }));

    const addedSubscriber = mockAddSubscriber.mock.calls[0][0];

    act(() => {
      addedSubscriber.onMessage(JSON.stringify({ type: 'unknown.event', payload: {} }));
    });

    expect(onChatMessage).not.toHaveBeenCalled();
  });

  it('logs warning when token is missing', () => {
    const { logger } = require('@/lib/utils');
    mockUseSession.mockReturnValue({
      data: { user: { token: null, userId: 'user-1' } },
    });

    renderHook(() => useChatRealtime({ enabled: true }));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('session token is missing'));
  });

  it('logs error when websocket URL is missing', () => {
    const { normalizeWebSocketBaseUrl, logger } = require('@/lib/utils');
    (normalizeWebSocketBaseUrl as jest.Mock).mockReturnValueOnce(null);

    renderHook(() => useChatRealtime({ enabled: true }));

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('websocket URL is not configured'),
      expect.any(Object),
    );
  });

  it('does not log websocket errors when disabled', () => {
    const { logger } = require('@/lib/utils');

    renderHook(() => useChatRealtime({ enabled: false }));

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
