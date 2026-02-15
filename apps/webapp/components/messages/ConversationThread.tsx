'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApolloClient, useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ArrowBack, Search, Send } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { GetUserByUsernameDocument } from '@/data/graphql/types/graphql';
import {
  useChatActions,
  useChatConversations,
  useChatMessages,
  useChatRealtime,
  useResolveConversationUsers,
} from '@/hooks';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc, logger } from '@/lib/utils';
import {
  buildConversationPreview,
  formatConversationRelativeTime,
  formatDayDividerLabel,
  formatThreadTime,
  isMessageGroupBreak,
  isSameCalendarDay,
  resolveChatIdentity,
} from '@/components/messages/chatUiUtils';

const CHAT_MESSAGES_LIMIT = 100;
const CHAT_CONVERSATIONS_LIMIT = 100;
const DESKTOP_PANEL_HEIGHT = 'calc(100vh - 220px)';
const LAST_OPEN_CHAT_USERNAME_KEY = 'ntlango:last-open-chat-username';
const MESSAGE_GROUP_WINDOW_MINUTES = 10;
const STICKY_BOTTOM_THRESHOLD_PX = 96;

type ThreadRenderItem =
  | {
      kind: 'divider';
      key: string;
      label: string;
    }
  | {
      kind: 'message';
      key: string;
      fromMe: boolean;
      isGroupStart: boolean;
      isGroupEnd: boolean;
      message: {
        chatMessageId: string;
        senderUserId: string;
        recipientUserId: string;
        message: string;
        isRead: boolean;
        createdAt: string;
      };
    };

interface ConversationThreadProps {
  username: string;
}

export default function ConversationThread({ username }: ConversationThreadProps) {
  const client = useApolloClient();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const { data: session } = useSession();
  const currentUserId = session?.user?.userId || null;
  const surfaceLineColor =
    theme.palette.mode === 'light' ? alpha(theme.palette.common.black, 0.14) : alpha(theme.palette.common.white, 0.18);

  const [draftMessage, setDraftMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messagesBottomRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markConversationReadRef = useRef<((withUserId: string) => Promise<void>) | null>(null);

  const {
    data: targetUserData,
    loading: targetUserLoading,
    error: targetUserError,
  } = useQuery(GetUserByUsernameDocument, {
    variables: { username },
    fetchPolicy: 'cache-and-network',
  });

  const targetUser = targetUserData?.readUserByUsername;
  const targetUserId = targetUser?.userId;

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
  } = useChatConversations({ limit: CHAT_CONVERSATIONS_LIMIT });

  const resolvedUsersByConversationId = useResolveConversationUsers(conversations);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
  } = useChatMessages({
    withUserId: targetUserId,
    limit: CHAT_MESSAGES_LIMIT,
    markAsRead: true,
  });

  const { markConversationRead: markConversationReadMutation } = useChatActions();

  const {
    isConnected,
    sendChatMessage,
    markConversationRead: markConversationReadRealtime,
  } = useChatRealtime({
    enabled: Boolean(currentUserId),
    onChatMessage: (payload) => {
      if (!targetUserId || !currentUserId) {
        return;
      }

      const isIncomingForOpenConversation =
        payload.senderUserId === targetUserId && payload.recipientUserId === currentUserId;

      if (!isIncomingForOpenConversation) {
        return;
      }

      scheduleMarkConversationRead();
    },
  });

  useEffect(() => {
    markConversationReadRef.current = async (withUserId: string) => {
      markConversationReadRealtime(withUserId);
      try {
        await markConversationReadMutation(withUserId);
      } catch (error) {
        logger.warn('Failed to mark conversation read through GraphQL mutation', {
          withUserId,
          error,
        });
      } finally {
        void client.refetchQueries({
          include: ['ReadChatConversations', 'ReadChatMessages', 'GetUnreadChatCount'],
        });
      }
    };
  }, [client, markConversationReadMutation, markConversationReadRealtime]);

  const scheduleMarkConversationRead = useCallback(() => {
    if (!targetUserId || !currentUserId) {
      return;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    if (markReadTimeoutRef.current) {
      return;
    }

    markReadTimeoutRef.current = setTimeout(() => {
      markReadTimeoutRef.current = null;
      void markConversationReadRef.current?.(targetUserId);
    }, 150);
  }, [currentUserId, targetUserId]);

  const updateScrollStickiness = useCallback(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom <= STICKY_BOTTOM_THRESHOLD_PX;

    shouldStickToBottomRef.current = isNearBottom;
    setShowJumpToLatest(!isNearBottom);
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      shouldStickToBottomRef.current = true;
      setShowJumpToLatest(false);
      messagesBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      updateScrollStickiness();
    },
    [updateScrollStickiness],
  );

  useEffect(() => {
    if (!targetUserId) {
      return;
    }

    scheduleMarkConversationRead();
  }, [scheduleMarkConversationRead, targetUserId]);

  useEffect(() => {
    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
        markReadTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }
      scheduleMarkConversationRead();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scheduleMarkConversationRead]);

  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      window.localStorage.setItem(LAST_OPEN_CHAT_USERNAME_KEY, username);
    }
  }, [username]);

  const conversationItems = useMemo(() => {
    const sortedConversations = [...conversations].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

    return sortedConversations.map((conversation) => {
      const resolved = resolvedUsersByConversationId[conversation.conversationWithUserId];
      const identity = resolveChatIdentity(
        {
          givenName: conversation.conversationWithUser?.given_name,
          familyName: conversation.conversationWithUser?.family_name,
          username: conversation.conversationWithUser?.username,
        },
        resolved,
      );

      const conversationUsername = identity.username;

      return {
        ...conversation,
        displayName: identity.displayName,
        handleLabel: identity.handleLabel,
        avatarSrc: conversation.conversationWithUser
          ? getAvatarSrc(conversation.conversationWithUser)
          : (resolved?.avatarSrc ?? undefined),
        preview: buildConversationPreview({
          lastMessage: conversation.lastMessage,
          currentUserId,
        }),
        relativeTime: formatConversationRelativeTime(conversation.updatedAt),
        href: conversationUsername ? ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(conversationUsername) : null,
        isSelected: conversationUsername ? conversationUsername.toLowerCase() === username.toLowerCase() : false,
      };
    });
  }, [conversations, currentUserId, resolvedUsersByConversationId, username]);

  const filteredConversationItems = useMemo(() => {
    const normalizedSearch = conversationSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return conversationItems;
    }

    return conversationItems.filter((conversation) => {
      const searchable =
        `${conversation.displayName} ${conversation.handleLabel ?? ''} ${conversation.preview}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [conversationItems, conversationSearch]);

  const renderedMessages = useMemo(() => {
    return [...messages].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [messages]);

  const threadItems = useMemo<ThreadRenderItem[]>(() => {
    if (renderedMessages.length === 0) {
      return [];
    }

    const items: ThreadRenderItem[] = [];

    renderedMessages.forEach((message, index) => {
      const previous = renderedMessages[index - 1];
      const next = renderedMessages[index + 1];

      if (!previous || !isSameCalendarDay(previous.createdAt, message.createdAt)) {
        items.push({
          kind: 'divider',
          key: `divider-${message.chatMessageId}`,
          label: formatDayDividerLabel(message.createdAt),
        });
      }

      const sameSenderAsPrevious = previous ? previous.senderUserId === message.senderUserId : false;
      const sameSenderAsNext = next ? next.senderUserId === message.senderUserId : false;

      const startsGroup =
        !previous ||
        !sameSenderAsPrevious ||
        !isSameCalendarDay(previous.createdAt, message.createdAt) ||
        isMessageGroupBreak({
          previousTimestamp: previous.createdAt,
          currentTimestamp: message.createdAt,
          windowMinutes: MESSAGE_GROUP_WINDOW_MINUTES,
        });

      const endsGroup =
        !next ||
        !sameSenderAsNext ||
        !isSameCalendarDay(next.createdAt, message.createdAt) ||
        isMessageGroupBreak({
          previousTimestamp: message.createdAt,
          currentTimestamp: next.createdAt,
          windowMinutes: MESSAGE_GROUP_WINDOW_MINUTES,
        });

      items.push({
        kind: 'message',
        key: message.chatMessageId,
        message,
        fromMe: message.senderUserId === currentUserId,
        isGroupStart: startsGroup,
        isGroupEnd: endsGroup,
      });
    });

    return items;
  }, [currentUserId, renderedMessages]);

  useEffect(() => {
    if (!targetUserId) {
      return;
    }

    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);

    const rafId = window.requestAnimationFrame(() => {
      messagesBottomRef.current?.scrollIntoView({ block: 'end' });
      updateScrollStickiness();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [targetUserId, updateScrollStickiness]);

  useEffect(() => {
    if (!targetUserId) {
      return;
    }

    if (shouldStickToBottomRef.current) {
      messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    setShowJumpToLatest(true);
  }, [messages.length, targetUserId]);

  const displayIdentity = useMemo(() => {
    return resolveChatIdentity({
      givenName: targetUser?.given_name,
      familyName: targetUser?.family_name,
      username: targetUser?.username || username,
    });
  }, [targetUser?.family_name, targetUser?.given_name, targetUser?.username, username]);

  const handleSendMessage = useCallback(() => {
    if (!targetUserId) {
      return;
    }

    const trimmedMessage = draftMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    const sent = sendChatMessage(targetUserId, trimmedMessage);
    if (!sent) {
      setSendError('Unable to send message right now. Reconnecting...');
      return;
    }

    setSendError(null);
    setDraftMessage('');
  }, [draftMessage, sendChatMessage, targetUserId]);

  const threadPane = (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, p: 2 }}>
      {!isDesktop && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton
            component={Link}
            href={ROUTES.ACCOUNT.MESSAGES}
            aria-label="Back to conversations"
            sx={{ ml: -1 }}
          >
            <ArrowBack />
          </IconButton>
        </Box>
      )}

      {targetUserLoading && !targetUser ? (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : targetUserError || !targetUser ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography color="error">Unable to open this conversation.</Typography>
          <Button component={Link} href={ROUTES.ACCOUNT.MESSAGES} variant="outlined">
            View all conversations
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={getAvatarSrc(targetUser)} alt={displayIdentity.displayName} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight="medium" noWrap>
                {displayIdentity.displayName}
              </Typography>
              <Typography variant="caption" color={isConnected ? 'success.main' : 'text.secondary'} noWrap>
                {isConnected ? 'Online' : 'Offline'}
                {displayIdentity.handleLabel ? ` · ${displayIdentity.handleLabel}` : ''}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: surfaceLineColor }} />

          <Box
            ref={messageListRef}
            onScroll={updateScrollStickiness}
            display="flex"
            flexDirection="column"
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1, py: 0.5 }}
          >
            {messagesLoading && threadItems.length === 0 ? (
              <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : messagesError ? (
              <Typography color="error">Failed to load messages.</Typography>
            ) : threadItems.length === 0 ? (
              <Typography color="text.secondary">No messages yet. Type a message in the input below.</Typography>
            ) : (
              threadItems.map((item) => {
                if (item.kind === 'divider') {
                  return (
                    <Box key={item.key} sx={{ display: 'flex', justifyContent: 'center', py: 1.25 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                    </Box>
                  );
                }

                const bubbleBorderRadius = item.fromMe
                  ? {
                      borderTopLeftRadius: 16,
                      borderBottomLeftRadius: 16,
                      borderTopRightRadius: item.isGroupStart ? 16 : 8,
                      borderBottomRightRadius: item.isGroupEnd ? 16 : 8,
                    }
                  : {
                      borderTopRightRadius: 16,
                      borderBottomRightRadius: 16,
                      borderTopLeftRadius: item.isGroupStart ? 16 : 8,
                      borderBottomLeftRadius: item.isGroupEnd ? 16 : 8,
                    };

                return (
                  <Box
                    key={item.key}
                    sx={{
                      alignSelf: item.fromMe ? 'flex-end' : 'flex-start',
                      maxWidth: { xs: '90%', md: '72%' },
                      mt: item.isGroupStart ? 1.25 : 0.4,
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: item.fromMe ? 'primary.main' : 'background.default',
                        color: item.fromMe ? 'primary.contrastText' : 'text.primary',
                        px: 1.5,
                        py: 1,
                        ...bubbleBorderRadius,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {item.message.message}
                      </Typography>
                    </Box>

                    {item.isGroupEnd && (
                      <Box
                        sx={{
                          mt: 0.4,
                          display: 'flex',
                          gap: 1,
                          justifyContent: item.fromMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {formatThreadTime(item.message.createdAt)}
                        </Typography>
                        {item.fromMe && (
                          <Typography variant="caption" color={item.message.isRead ? 'primary.main' : 'text.secondary'}>
                            {item.message.isRead ? 'Read' : 'Sent'}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
            <Box ref={messagesBottomRef} />
          </Box>

          {showJumpToLatest && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Button size="small" variant="outlined" onClick={() => scrollToLatest('smooth')}>
                New messages
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 2, borderColor: surfaceLineColor }} />

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
              border: '1px solid',
              borderColor: (muiTheme) =>
                muiTheme.palette.mode === 'light'
                  ? alpha(muiTheme.palette.text.primary, 0.2)
                  : alpha(muiTheme.palette.common.white, 0.22),
              borderRadius: 4,
              px: 1.25,
              py: 0.75,
              backgroundColor: (muiTheme) =>
                muiTheme.palette.mode === 'light'
                  ? alpha(muiTheme.palette.common.black, 0.015)
                  : muiTheme.palette.background.default,
              boxShadow: (muiTheme) =>
                muiTheme.palette.mode === 'light' ? `0 1px 2px ${alpha(muiTheme.palette.common.black, 0.08)}` : 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '&:focus-within': {
                borderColor: 'primary.main',
                boxShadow: (muiTheme) => `0 0 0 3px ${alpha(muiTheme.palette.primary.main, 0.18)}`,
              },
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              variant="standard"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Type your message..."
              slotProps={{
                input: {
                  disableUnderline: true,
                },
              }}
              sx={{
                '& .MuiInputBase-root': {
                  py: 0,
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiInputBase-inputMultiline': {
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  fontSize: '0.98rem',
                  lineHeight: 1.45,
                },
                '& textarea::placeholder': {
                  opacity: 1,
                },
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!draftMessage.trim() || !isConnected || !targetUserId}
              aria-label="Send message"
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              <Send />
            </IconButton>
          </Box>
          {sendError && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {sendError}
            </Typography>
          )}
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Messages
        </Typography>

        <Paper
          sx={{
            minHeight: { xs: '70vh', md: DESKTOP_PANEL_HEIGHT },
            height: { md: DESKTOP_PANEL_HEIGHT },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: 'hidden',
            border: '1px solid',
            borderColor: surfaceLineColor,
          }}
        >
          {isDesktop && (
            <Box
              sx={{
                width: 360,
                borderRight: '1px solid',
                borderColor: surfaceLineColor,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: surfaceLineColor }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Conversations
                </Typography>
                <TextField
                  fullWidth
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  size="small"
                  placeholder="Search conversations"
                  sx={{ mt: 1.5 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {conversationsLoading && conversations.length === 0 ? (
                  <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : conversationsError ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="error">Failed to load conversations.</Typography>
                  </Box>
                ) : filteredConversationItems.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      {conversationSearch.trim() ? 'No conversations match your search.' : 'No messages yet.'}
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {filteredConversationItems.map((conversation, index) => (
                      <React.Fragment key={conversation.conversationWithUserId}>
                        <ListItem disablePadding>
                          {conversation.href ? (
                            <ListItemButton
                              component={Link}
                              href={conversation.href}
                              sx={{
                                mx: 1,
                                my: 0.5,
                                px: 2,
                                py: 1.5,
                                borderRadius: 1.5,
                                borderLeft: '3px solid',
                                borderLeftColor: conversation.isSelected ? 'primary.main' : 'transparent',
                                backgroundColor: (muiTheme) =>
                                  conversation.isSelected
                                    ? muiTheme.palette.mode === 'light'
                                      ? alpha(muiTheme.palette.primary.main, 0.18)
                                      : alpha(muiTheme.palette.primary.main, 0.24)
                                    : 'inherit',
                                boxShadow: (muiTheme) =>
                                  conversation.isSelected
                                    ? `inset 0 0 0 1px ${
                                        muiTheme.palette.mode === 'light'
                                          ? alpha(muiTheme.palette.primary.main, 0.28)
                                          : alpha(muiTheme.palette.primary.main, 0.34)
                                      }`
                                    : 'none',
                                '&:hover': {
                                  backgroundColor: (muiTheme) =>
                                    conversation.isSelected
                                      ? muiTheme.palette.mode === 'light'
                                        ? alpha(muiTheme.palette.primary.main, 0.24)
                                        : alpha(muiTheme.palette.primary.main, 0.28)
                                      : muiTheme.palette.action.hover,
                                },
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar src={conversation.avatarSrc} alt={conversation.displayName} />
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: 1,
                                      alignItems: 'flex-start',
                                    }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography
                                        variant="subtitle2"
                                        noWrap
                                        fontWeight={conversation.unreadCount > 0 ? 700 : 500}
                                      >
                                        {conversation.displayName}
                                      </Typography>
                                      {conversation.handleLabel && (
                                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                                          {conversation.handleLabel}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        {conversation.relativeTime}
                                      </Typography>
                                      {conversation.unreadCount > 0 && (
                                        <Box
                                          sx={{
                                            minWidth: 20,
                                            height: 20,
                                            px: 0.75,
                                            borderRadius: 10,
                                            backgroundColor: 'primary.main',
                                            color: 'primary.contrastText',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                          }}
                                        >
                                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                }
                                secondary={
                                  <Typography
                                    variant="body2"
                                    component="span"
                                    noWrap
                                    color={conversation.unreadCount > 0 ? 'text.primary' : 'text.secondary'}
                                    fontWeight={conversation.unreadCount > 0 ? 600 : 400}
                                  >
                                    {conversation.preview}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          ) : (
                            <ListItemButton disabled sx={{ px: 2, py: 1.5 }}>
                              <ListItemAvatar>
                                <Avatar src={conversation.avatarSrc} alt={conversation.displayName} />
                              </ListItemAvatar>
                              <ListItemText
                                primary={conversation.displayName}
                                secondary={
                                  <Typography variant="body2" color="text.secondary" component="span" noWrap>
                                    {conversation.preview}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          )}
                        </ListItem>
                        {index < filteredConversationItems.length - 1 && (
                          <Divider component="li" sx={{ borderColor: surfaceLineColor, mx: 1 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
          )}

          {threadPane}
        </Paper>
      </Container>
    </Box>
  );
}
