'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ChatBubbleOutline, Search } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useChatConversations, useResolveConversationUsers } from '@/hooks';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc } from '@/lib/utils';
import {
  buildConversationPreview,
  formatConversationRelativeTime,
  resolveChatIdentity,
} from '@/components/messages/chatUiUtils';

const CHAT_CONVERSATIONS_LIMIT = 100;

export default function MessagesPanel() {
  const theme = useTheme();
  const pathname = usePathname();
  const surfaceLineColor =
    theme.palette.mode === 'light' ? alpha(theme.palette.common.black, 0.14) : alpha(theme.palette.common.white, 0.18);
  const { data: session } = useSession();
  const currentUserId = session?.user?.userId || null;

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
  } = useChatConversations({ limit: CHAT_CONVERSATIONS_LIMIT });

  const [searchQuery, setSearchQuery] = useState('');
  const resolvedUsersByConversationId = useResolveConversationUsers(conversations);

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

      const username = identity.username;

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
        href: username ? ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(username) : null,
      };
    });
  }, [conversations, currentUserId, resolvedUsersByConversationId]);

  const filteredConversationItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return conversationItems;
    }

    return conversationItems.filter((conversation) => {
      const searchable =
        `${conversation.displayName} ${conversation.handleLabel ?? ''} ${conversation.preview}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [conversationItems, searchQuery]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxWidth: 640,
        mx: 'auto',
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: conversationItems.length > 0 ? 2 : 0 }}>
          Messages
        </Typography>
        {conversationItems.length > 0 && (
          <TextField
            id="messages-panel-search"
            fullWidth
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            size="small"
            placeholder="Search conversations"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <Search sx={{ color: 'text.secondary', fontSize: 22 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={(muiTheme) => ({
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                boxShadow:
                  muiTheme.palette.mode === 'light'
                    ? `0 1px 2px ${alpha(muiTheme.palette.common.black, 0.08)}`
                    : 'none',
                '& fieldset': {
                  borderColor:
                    muiTheme.palette.mode === 'light'
                      ? alpha(muiTheme.palette.text.primary, 0.2)
                      : alpha(muiTheme.palette.common.white, 0.22),
                },
                '&:hover fieldset': {
                  borderColor:
                    muiTheme.palette.mode === 'light'
                      ? alpha(muiTheme.palette.text.primary, 0.35)
                      : alpha(muiTheme.palette.common.white, 0.35),
                },
                '&.Mui-focused fieldset': {
                  borderColor: muiTheme.palette.primary.main,
                  borderWidth: 1,
                },
              },
            })}
          />
        )}
      </Box>

      <Divider sx={{ borderColor: surfaceLineColor }} />

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
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 10,
              px: 3,
              textAlign: 'center',
            }}
          >
            <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary', mb: 1 }}>
              {searchQuery.trim() ? 'No results' : 'No messages yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery.trim()
                ? 'Try a different search term.'
                : "Start a conversation by visiting a user's profile and sending them a message."}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredConversationItems.map((conversation, index) => {
              const rowContent = (
                <>
                  <ListItemAvatar>
                    <Avatar src={conversation.avatarSrc} alt={conversation.displayName} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap fontWeight={conversation.unreadCount > 0 ? 700 : 500}>
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
                </>
              );

              return (
                <React.Fragment key={conversation.conversationWithUserId}>
                  <ListItem disablePadding>
                    {conversation.href ? (
                      <ListItemButton
                        component={Link}
                        href={conversation.href}
                        selected={pathname === conversation.href}
                        sx={{
                          px: 2,
                          py: 1.5,
                          '&:hover': { backgroundColor: 'action.hover' },
                          '&.Mui-selected': { backgroundColor: 'action.selected' },
                          '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                        }}
                      >
                        {rowContent}
                      </ListItemButton>
                    ) : (
                      <ListItemButton disabled sx={{ px: 2, py: 1.5 }}>
                        {rowContent}
                      </ListItemButton>
                    )}
                  </ListItem>
                  {index < filteredConversationItems.length - 1 && (
                    <Divider component="li" sx={{ borderColor: surfaceLineColor }} />
                  )}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
