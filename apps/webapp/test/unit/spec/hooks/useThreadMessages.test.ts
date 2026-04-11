import { act, renderHook } from '@testing-library/react';
import { useThreadMessages, type ThreadMessage, type ThreadRenderItem } from '@/hooks/useThreadMessages';

const makeMsg = (overrides: Partial<ThreadMessage> & { id: string; sender: string }): ThreadMessage => ({
  chatMessageId: overrides.id,
  senderUserId: overrides.sender,
  recipientUserId: overrides.recipientUserId ?? 'user-b',
  message: overrides.message ?? 'hello',
  isRead: overrides.isRead ?? false,
  createdAt: overrides.createdAt ?? '2024-06-01T10:00:00.000Z',
});

const dividerItems = (items: ThreadRenderItem[]) =>
  items.filter((i): i is Extract<ThreadRenderItem, { kind: 'divider' }> => i.kind === 'divider');
const messageItems = (items: ThreadRenderItem[]) =>
  items.filter((i): i is Extract<ThreadRenderItem, { kind: 'message' }> => i.kind === 'message');

// Offset a base ISO timestamp by N minutes
const addMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

// Offset by N days
const addDays = (iso: string, days: number): string =>
  new Date(new Date(iso).getTime() + days * 24 * 60 * 60_000).toISOString();

const BASE = '2024-06-01T10:00:00.000Z';
const CURRENT_USER = 'user-a';
const OTHER_USER = 'user-b';
type HookProps = { messages: ThreadMessage[] };

const renderUseThreadMessages = (messages: ThreadMessage[] = []) =>
  renderHook(({ messages }: HookProps) => useThreadMessages({ messages, currentUserId: CURRENT_USER }), {
    initialProps: { messages },
  });

describe('useThreadMessages — grouping', () => {
  it('returns an empty array when no messages are supplied', () => {
    const { result } = renderHook(() => useThreadMessages({ messages: [], currentUserId: CURRENT_USER }));
    expect(result.current.threadItems).toHaveLength(0);
  });

  it('emits one message item and one divider for a single message', () => {
    const messages = [makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const items = result.current.threadItems;
    expect(dividerItems(items)).toHaveLength(1);
    expect(messageItems(items)).toHaveLength(1);
  });

  it('marks a lone message as both group start and group end', () => {
    const messages = [makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const [msg] = messageItems(result.current.threadItems);
    expect(msg.isGroupStart).toBe(true);
    expect(msg.isGroupEnd).toBe(true);
  });

  it('groups consecutive messages from the same sender within 10 minutes', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: addMinutes(BASE, 5) }),
      makeMsg({ id: 'm3', sender: CURRENT_USER, createdAt: addMinutes(BASE, 9) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].isGroupStart).toBe(true);
    expect(msgs[0].isGroupEnd).toBe(false);
    expect(msgs[1].isGroupStart).toBe(false);
    expect(msgs[1].isGroupEnd).toBe(false);
    expect(msgs[2].isGroupStart).toBe(false);
    expect(msgs[2].isGroupEnd).toBe(true);
  });

  it('breaks the group when gap exceeds 10 minutes', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: addMinutes(BASE, 11) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].isGroupEnd).toBe(true);
    expect(msgs[1].isGroupStart).toBe(true);
  });

  it('breaks the group when sender changes', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: OTHER_USER, createdAt: addMinutes(BASE, 1) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].isGroupEnd).toBe(true);
    expect(msgs[1].isGroupStart).toBe(true);
  });

  it('sets fromMe=true for messages sent by currentUserId', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: OTHER_USER, createdAt: addMinutes(BASE, 1) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].fromMe).toBe(true);
    expect(msgs[1].fromMe).toBe(false);
  });

  it('sorts messages by createdAt ascending regardless of input order', () => {
    const messages = [
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: addMinutes(BASE, 5) }),
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].message.chatMessageId).toBe('m1');
    expect(msgs[1].message.chatMessageId).toBe('m2');
  });
});

describe('useThreadMessages — day dividers', () => {
  it('emits a day divider before the first message', () => {
    const messages = [makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    expect(dividerItems(result.current.threadItems)).toHaveLength(1);
  });

  it('does not emit an extra divider for consecutive messages on the same day', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: OTHER_USER, createdAt: addMinutes(BASE, 30) }),
      makeMsg({ id: 'm3', sender: CURRENT_USER, createdAt: addMinutes(BASE, 60) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    expect(dividerItems(result.current.threadItems)).toHaveLength(1);
  });

  it('emits a new divider when messages span two calendar days', () => {
    const day2 = addDays(BASE, 1);
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: day2 }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    expect(dividerItems(result.current.threadItems)).toHaveLength(2);
  });

  it('emits one divider per unique calendar day', () => {
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: addDays(BASE, 1) }),
      makeMsg({ id: 'm3', sender: CURRENT_USER, createdAt: addDays(BASE, 2) }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    expect(dividerItems(result.current.threadItems)).toHaveLength(3);
  });

  it('each divider key is prefixed with "divider-"', () => {
    const messages = [makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const [divider] = dividerItems(result.current.threadItems);
    expect(divider.key).toMatch(/^divider-/);
  });

  it('interleaves dividers and messages in chronological order', () => {
    const day2 = addDays(BASE, 1);
    const messages = [
      makeMsg({ id: 'm1', sender: CURRENT_USER, createdAt: BASE }),
      makeMsg({ id: 'm2', sender: CURRENT_USER, createdAt: day2 }),
    ];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const kinds = result.current.threadItems.map((i) => i.kind);
    expect(kinds).toEqual(['divider', 'message', 'divider', 'message']);
  });
});

describe('useThreadMessages — addPendingMessage', () => {
  it('appends a pending message item at the end of threadItems', () => {
    const messages = [makeMsg({ id: 'm1', sender: OTHER_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'pending text' });
    });

    const msgs = messageItems(result.current.threadItems);
    const pending = msgs.find((m) => m.pending);
    expect(pending).toBeDefined();
    expect(pending!.message.message).toBe('pending text');
    expect(pending!.fromMe).toBe(true);
  });

  it('marks pending messages with pending=true', () => {
    const { result } = renderHook(() => useThreadMessages({ messages: [], currentUserId: CURRENT_USER }));

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'hi' });
    });

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].pending).toBe(true);
  });

  it('non-pending messages have pending=false', () => {
    const messages = [makeMsg({ id: 'm1', sender: OTHER_USER, createdAt: BASE })];
    const { result } = renderHook(() => useThreadMessages({ messages, currentUserId: CURRENT_USER }));

    const msgs = messageItems(result.current.threadItems);
    expect(msgs[0].pending).toBe(false);
  });

  it('multiple pending messages are all appended', () => {
    const { result } = renderHook(() => useThreadMessages({ messages: [], currentUserId: CURRENT_USER }));

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'msg-1' });
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'msg-2' });
    });

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(2);
  });
});

describe('useThreadMessages — pending-message pruning', () => {
  it('removes a pending message when a matching confirmed message arrives', async () => {
    const confirmedAt = new Date(Date.now() - 5_000).toISOString(); // 5s ago — within 30s window

    const { result, rerender } = renderUseThreadMessages();

    // Add pending message
    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'confirm me' });
    });

    // Verify it is present
    expect(messageItems(result.current.threadItems).some((m) => m.pending)).toBe(true);

    // Server confirms it
    const confirmed: ThreadMessage = {
      chatMessageId: 'confirmed-1',
      senderUserId: CURRENT_USER,
      recipientUserId: OTHER_USER,
      message: 'confirm me',
      isRead: false,
      createdAt: confirmedAt,
    };

    rerender({ messages: [confirmed] });

    // Wait for the pruning effect to flush
    await act(async () => {});

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(0);
  });

  it('keeps a pending message when the server message has a different text', async () => {
    const { result, rerender } = renderUseThreadMessages();

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'my message' });
    });

    const unrelated: ThreadMessage = {
      chatMessageId: 'x1',
      senderUserId: CURRENT_USER,
      recipientUserId: OTHER_USER,
      message: 'different message',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    rerender({ messages: [unrelated] });
    await act(async () => {});

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(1);
  });

  it('keeps a pending message when the confirmed message is from a different sender', async () => {
    const { result, rerender } = renderUseThreadMessages();

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'hi' });
    });

    const wrongSender: ThreadMessage = {
      chatMessageId: 'x2',
      senderUserId: OTHER_USER, // confirmed but sent by OTHER, not CURRENT
      recipientUserId: CURRENT_USER,
      message: 'hi',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    rerender({ messages: [wrongSender] });
    await act(async () => {});

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(1);
  });

  it('keeps a pending message when the confirmed createdAt is outside the 30s window', async () => {
    const { result, rerender } = renderUseThreadMessages();

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'stale match' });
    });

    const stale: ThreadMessage = {
      chatMessageId: 'x3',
      senderUserId: CURRENT_USER,
      recipientUserId: OTHER_USER,
      message: 'stale match',
      isRead: false,
      createdAt: new Date(Date.now() - 60_000).toISOString(), // 60s ago — outside window
    };

    rerender({ messages: [stale] });
    await act(async () => {});

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(1);
  });

  it('prunes only the matched pending message when multiple are pending', async () => {
    const confirmedAt = new Date(Date.now() - 5_000).toISOString();

    const { result, rerender } = renderUseThreadMessages();

    act(() => {
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'first' });
      result.current.addPendingMessage({ recipientUserId: OTHER_USER, message: 'second' });
    });

    const confirmed: ThreadMessage = {
      chatMessageId: 'c1',
      senderUserId: CURRENT_USER,
      recipientUserId: OTHER_USER,
      message: 'first',
      isRead: false,
      createdAt: confirmedAt,
    };

    rerender({ messages: [confirmed] });
    await act(async () => {});

    const pending = messageItems(result.current.threadItems).filter((m) => m.pending);
    expect(pending).toHaveLength(1);
    expect(pending[0].message.message).toBe('second');
  });
});
