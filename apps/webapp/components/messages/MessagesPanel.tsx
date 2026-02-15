'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  CircularProgress,
  Container,
  Divider,
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
import { Search } from '@mui/icons-material';
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
const DESKTOP_PANEL_HEIGHT = 'calc(100vh - 220px)';

export default function MessagesPanel() {
  const theme = useTheme();
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
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Messages
        </Typography>

        <Paper
          sx={{
            minHeight: { xs: '70vh', md: DESKTOP_PANEL_HEIGHT },
            height: { md: DESKTOP_PANEL_HEIGHT },
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: surfaceLineColor,
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: surfaceLineColor }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Conversations
            </Typography>
            <TextField
              fullWidth
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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
                  {searchQuery.trim() ? 'No conversations match your search.' : 'No messages yet.'}
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
                          <Box
                            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}
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
                    </>
                  );

                  return (
                    <React.Fragment key={conversation.conversationWithUserId}>
                      <ListItem disablePadding>
                        {conversation.href ? (
                          <ListItemButton
                            component={Link}
                            href={conversation.href}
                            sx={{
                              px: 2,
                              py: 1.5,
                              '&:hover': { backgroundColor: 'action.hover' },
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
        </Paper>
      </Container>
    </Box>
  );
}
