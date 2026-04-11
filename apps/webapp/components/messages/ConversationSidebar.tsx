'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Search } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc } from '@/lib/utils';
import {
  buildConversationPreview,
  formatConversationRelativeTime,
  resolveChatIdentity,
} from '@/components/messages/chatUiUtils';

interface ConversationSidebarProps {
  conversations: {
    conversationWithUserId: string;
    updatedAt: string;
    lastMessage: { senderUserId: string; message: string } | null;
    unreadCount: number;
    conversationWithUser?: {
      given_name?: string | null;
      family_name?: string | null;
      username?: string | null;
      [key: string]: unknown;
    } | null;
  }[];
  conversationsLoading: boolean;
  conversationsError: unknown;
  currentUserId: string | null;
  username: string;
  resolvedUsersByConversationId: Record<string, { displayName?: string; username?: string; avatarSrc?: string }>;
}

export function ConversationSidebar({
  conversations,
  conversationsLoading,
  conversationsError,
  currentUserId,
  username,
  resolvedUsersByConversationId,
}: ConversationSidebarProps) {
  const theme = useTheme();
  const [conversationSearch, setConversationSearch] = useState('');

  const surfaceLineColor =
    theme.palette.mode === 'light' ? alpha(theme.palette.common.black, 0.14) : alpha(theme.palette.common.white, 0.18);

  const conversationItems = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return sorted.map((conversation) => {
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
          ? getAvatarSrc(conversation.conversationWithUser as Parameters<typeof getAvatarSrc>[0])
          : (resolved?.avatarSrc ?? undefined),
        preview: buildConversationPreview({ lastMessage: conversation.lastMessage, currentUserId }),
        relativeTime: formatConversationRelativeTime(conversation.updatedAt),
        href: conversationUsername ? ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(conversationUsername) : null,
        isSelected: conversationUsername ? conversationUsername.toLowerCase() === username.toLowerCase() : false,
      };
    });
  }, [conversations, currentUserId, resolvedUsersByConversationId, username]);

  const filteredConversationItems = useMemo(() => {
    const normalizedSearch = conversationSearch.trim().toLowerCase();
    if (!normalizedSearch) return conversationItems;

    return conversationItems.filter((conversation) => {
      const searchable =
        `${conversation.displayName} ${conversation.handleLabel ?? ''} ${conversation.preview}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [conversationItems, conversationSearch]);

  return (
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
          sx={(muiTheme) => ({
            mt: 1.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              boxShadow:
                muiTheme.palette.mode === 'light' ? `0 1px 2px ${alpha(muiTheme.palette.common.black, 0.08)}` : 'none',
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 0.5 }}>
                  <Search sx={{ color: 'text.secondary', fontSize: 22 }} />
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
  );
}
