import { differenceInMinutes, format, isThisYear, isToday, isYesterday } from 'date-fns';

type IdentityInput = {
  givenName?: string | null;
  familyName?: string | null;
  username?: string | null;
};

type IdentityFallback = {
  displayName?: string;
  username?: string;
};

type LastMessageInput = {
  senderUserId: string;
  message: string;
} | null;

const trimAndCollapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

const safeDate = (value: string | Date): Date | null => {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}\u2026`;
};

export const resolveChatIdentity = (
  input: IdentityInput,
  fallback?: IdentityFallback,
): { displayName: string; username?: string; handleLabel?: string } => {
  const fullName = [input.givenName, input.familyName].filter(Boolean).join(' ').trim();
  const username = input.username || fallback?.username;

  if (fullName) {
    return {
      displayName: fullName,
      username: username ?? undefined,
      handleLabel: username ? `@${username}` : undefined,
    };
  }

  if (username) {
    return {
      displayName: `@${username}`,
      username,
      handleLabel: undefined,
    };
  }

  const fallbackDisplayName = fallback?.displayName?.trim();
  if (fallbackDisplayName) {
    return {
      displayName: fallbackDisplayName,
      username: username ?? undefined,
      handleLabel: username ? `@${username}` : undefined,
    };
  }

  return {
    displayName: 'Conversation',
    username: undefined,
    handleLabel: undefined,
  };
};

export const buildConversationPreview = ({
  lastMessage,
  currentUserId,
  maxLength = 48,
}: {
  lastMessage: LastMessageInput;
  currentUserId?: string | null;
  maxLength?: number;
}): string => {
  if (!lastMessage) {
    return 'No messages yet';
  }

  const rawMessage = lastMessage.message.trim();
  let body = 'Message';

  if (rawMessage.length > 0) {
    const lines = rawMessage
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length >= 2 && HTTP_URL_PATTERN.test(lines[lines.length - 1])) {
      const withoutTrailingUrl = trimAndCollapseWhitespace(lines.slice(0, -1).join(' '));
      body = withoutTrailingUrl || 'Shared a link';
    } else if (HTTP_URL_PATTERN.test(rawMessage)) {
      body = 'Shared a link';
    } else {
      body = trimAndCollapseWhitespace(rawMessage);
    }
  }

  const prefix = currentUserId && lastMessage.senderUserId === currentUserId ? 'You: ' : '';
  return truncate(`${prefix}${body}`, maxLength);
};

export const formatConversationRelativeTime = (value: string | Date): string => {
  const date = safeDate(value);
  if (!date) {
    return '';
  }

  const now = Date.now();
  const deltaMs = Math.max(now - date.getTime(), 0);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (deltaMs < hourMs) {
    const minutes = Math.max(1, Math.floor(deltaMs / minuteMs));
    return `${minutes}m`;
  }

  if (deltaMs < dayMs) {
    const hours = Math.floor(deltaMs / hourMs);
    return `${hours}h`;
  }

  if (deltaMs < 7 * dayMs) {
    const days = Math.floor(deltaMs / dayMs);
    return `${days}d`;
  }

  if (deltaMs < 28 * dayMs) {
    const weeks = Math.floor(deltaMs / (7 * dayMs));
    return `${weeks}w`;
  }

  return isThisYear(date) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
};

export const formatThreadTime = (value: string | Date): string => {
  const date = safeDate(value);
  if (!date) {
    return '';
  }

  return format(date, 'HH:mm');
};

export const formatDayDividerLabel = (value: string | Date): string => {
  const date = safeDate(value);
  if (!date) {
    return '';
  }

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return isThisYear(date) ? format(date, 'EEE, MMM d') : format(date, 'MMM d, yyyy');
};

export const isSameCalendarDay = (left: string | Date, right: string | Date): boolean => {
  const leftDate = safeDate(left);
  const rightDate = safeDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return format(leftDate, 'yyyy-MM-dd') === format(rightDate, 'yyyy-MM-dd');
};

export const isMessageGroupBreak = ({
  previousTimestamp,
  currentTimestamp,
  windowMinutes = 10,
}: {
  previousTimestamp?: string | Date;
  currentTimestamp: string | Date;
  windowMinutes?: number;
}): boolean => {
  if (!previousTimestamp) {
    return true;
  }

  const prev = safeDate(previousTimestamp);
  const curr = safeDate(currentTimestamp);
  if (!prev || !curr) {
    return true;
  }

  return differenceInMinutes(curr, prev) > windowMinutes;
};
