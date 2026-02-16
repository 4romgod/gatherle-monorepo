import {
  buildConversationPreview,
  formatConversationRelativeTime,
  formatDayDividerLabel,
  formatThreadTime,
  isMessageGroupBreak,
  isSameCalendarDay,
  resolveChatIdentity,
} from '@/components/messages/chatUiUtils';

describe('chatUiUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('resolveChatIdentity', () => {
    it('prefers full name and keeps username as handle', () => {
      const result = resolveChatIdentity({
        givenName: 'Jane',
        familyName: 'Doe',
        username: 'jane',
      });

      expect(result).toEqual({
        displayName: 'Jane Doe',
        username: 'jane',
        handleLabel: '@jane',
      });
    });

    it('falls back to username when full name is missing', () => {
      const result = resolveChatIdentity({ username: 'ntl_user' });

      expect(result).toEqual({
        displayName: '@ntl_user',
        username: 'ntl_user',
        handleLabel: undefined,
      });
    });

    it('uses fallback identity when primary values are missing', () => {
      const result = resolveChatIdentity({}, { displayName: 'Fallback Name', username: 'fallback' });

      expect(result).toEqual({
        displayName: '@fallback',
        username: 'fallback',
        handleLabel: undefined,
      });
    });

    it('uses fallback displayName when username is not available', () => {
      const result = resolveChatIdentity({}, { displayName: 'Fallback Name' });

      expect(result).toEqual({
        displayName: 'Fallback Name',
        username: undefined,
        handleLabel: undefined,
      });
    });

    it('falls back to generic conversation label when no identity is available', () => {
      const result = resolveChatIdentity({});

      expect(result).toEqual({
        displayName: 'Conversation',
        username: undefined,
        handleLabel: undefined,
      });
    });
  });

  describe('buildConversationPreview', () => {
    it('adds "You:" prefix when sender is current user', () => {
      const result = buildConversationPreview({
        lastMessage: {
          senderUserId: 'me',
          message: 'Hello there',
        },
        currentUserId: 'me',
      });

      expect(result).toBe('You: Hello there');
    });

    it('truncates previews to the provided length', () => {
      const result = buildConversationPreview({
        lastMessage: {
          senderUserId: 'them',
          message: 'This is a long message that should be truncated for preview output',
        },
        currentUserId: 'me',
        maxLength: 20,
      });

      expect(result).toBe('This is a long mess…');
    });

    it('returns default empty-state preview when no message exists', () => {
      expect(
        buildConversationPreview({
          lastMessage: null,
        }),
      ).toBe('No messages yet');
    });

    it('normalizes whitespace and handles empty message bodies', () => {
      expect(
        buildConversationPreview({
          lastMessage: {
            senderUserId: 'them',
            message: '   hello      world   ',
          },
          currentUserId: 'me',
        }),
      ).toBe('hello world');

      expect(
        buildConversationPreview({
          lastMessage: {
            senderUserId: 'them',
            message: '   ',
          },
          currentUserId: 'me',
        }),
      ).toBe('Message');
    });

    it('hides trailing event-share URLs from preview text', () => {
      expect(
        buildConversationPreview({
          lastMessage: {
            senderUserId: 'them',
            message: 'Streetcar Platform: Transit Stories\nhttp://localhost:3000/events/streetcar-platform',
          },
          currentUserId: 'me',
        }),
      ).toBe('Streetcar Platform: Transit Stories');
    });

    it('shows a generic label when the full message is only a URL', () => {
      expect(
        buildConversationPreview({
          lastMessage: {
            senderUserId: 'them',
            message: 'https://example.com/path',
          },
          currentUserId: 'me',
        }),
      ).toBe('Shared a link');
    });
  });

  describe('time formatting helpers', () => {
    it('formats compact relative timestamps', () => {
      expect(formatConversationRelativeTime(new Date('2026-02-15T11:58:00.000Z'))).toBe('2m');
      expect(formatConversationRelativeTime(new Date('2026-02-15T09:00:00.000Z'))).toBe('3h');
      expect(formatConversationRelativeTime(new Date('2026-02-12T12:00:00.000Z'))).toBe('3d');
      expect(formatConversationRelativeTime(new Date('2026-02-01T12:00:00.000Z'))).toBe('2w');
    });

    it('formats day divider labels', () => {
      expect(formatDayDividerLabel(new Date('2026-02-15T05:00:00.000Z'))).toBe('Today');
      expect(formatDayDividerLabel(new Date('2026-02-14T12:00:00.000Z'))).toBe('Yesterday');
      expect(formatDayDividerLabel(new Date('2026-02-10T12:00:00.000Z'))).toContain('Feb');
    });

    it('formats thread time as HH:mm', () => {
      expect(formatThreadTime(new Date('2026-02-15T09:07:00'))).toBe('09:07');
    });

    it('falls back to month/date formatting for old timestamps and handles invalid dates', () => {
      expect(formatConversationRelativeTime(new Date('2026-01-10T12:00:00.000Z'))).toContain('Jan');
      expect(formatConversationRelativeTime('not-a-date')).toBe('');
      expect(formatDayDividerLabel('not-a-date')).toBe('');
      expect(formatThreadTime('not-a-date')).toBe('');
    });
  });

  describe('grouping helpers', () => {
    it('checks same calendar day correctly', () => {
      expect(isSameCalendarDay('2026-02-15T09:00:00', '2026-02-15T22:30:00')).toBe(true);
      expect(isSameCalendarDay('2026-02-15T23:59:00', '2026-02-16T00:01:00')).toBe(false);
    });

    it('marks a group break when gap exceeds threshold', () => {
      expect(
        isMessageGroupBreak({
          previousTimestamp: '2026-02-15T10:00:00.000Z',
          currentTimestamp: '2026-02-15T10:05:00.000Z',
          windowMinutes: 10,
        }),
      ).toBe(false);

      expect(
        isMessageGroupBreak({
          previousTimestamp: '2026-02-15T10:00:00.000Z',
          currentTimestamp: '2026-02-15T10:12:00.000Z',
          windowMinutes: 10,
        }),
      ).toBe(true);
    });

    it('treats missing or invalid timestamps as a group break and not same day', () => {
      expect(
        isMessageGroupBreak({
          previousTimestamp: undefined,
          currentTimestamp: '2026-02-15T10:12:00.000Z',
          windowMinutes: 10,
        }),
      ).toBe(true);

      expect(
        isMessageGroupBreak({
          previousTimestamp: 'invalid',
          currentTimestamp: '2026-02-15T10:12:00.000Z',
          windowMinutes: 10,
        }),
      ).toBe(true);

      expect(isSameCalendarDay('invalid', '2026-02-15T22:30:00')).toBe(false);
    });
  });
});
