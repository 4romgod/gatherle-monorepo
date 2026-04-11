'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, Box, Button, CircularProgress, Divider, IconButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ArrowBack, KeyboardArrowDown } from '@mui/icons-material';
import { AccessTime } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc } from '@/lib/utils';
import { formatThreadTime } from '@/components/messages/chatUiUtils';
import type { ThreadRenderItem } from '@/hooks/useThreadMessages';

interface ThreadUser {
  userId: string;
  given_name?: string | null;
  family_name?: string | null;
  username?: string | null;
  [key: string]: unknown;
}

interface DisplayIdentity {
  displayName: string;
  handleLabel?: string | null;
  username: string | null;
}

interface MessageThreadProps {
  threadItems: ThreadRenderItem[];
  messagesLoading: boolean;
  messagesError: unknown;
  targetUser: ThreadUser | null | undefined;
  displayIdentity: DisplayIdentity;
  username: string;
  isDesktop: boolean;
  showJumpToLatest: boolean;
  scrollToLatest: (behavior?: ScrollBehavior) => void;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  messagesBottomRef: React.RefObject<HTMLDivElement | null>;
  updateScrollStickiness: () => void;
}

export function MessageThread({
  threadItems,
  messagesLoading,
  messagesError,
  targetUser,
  displayIdentity,
  username,
  isDesktop,
  showJumpToLatest,
  scrollToLatest,
  messageListRef,
  messagesBottomRef,
  updateScrollStickiness,
}: MessageThreadProps) {
  const theme = useTheme();
  const surfaceLineColor =
    theme.palette.mode === 'light' ? alpha(theme.palette.common.black, 0.14) : alpha(theme.palette.common.white, 0.18);

  return (
    <>
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component={Link}
          href={ROUTES.USERS.USER(username)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minWidth: 0,
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { opacity: 0.85 },
          }}
        >
          <Avatar
            src={targetUser ? getAvatarSrc(targetUser as Parameters<typeof getAvatarSrc>[0]) : undefined}
            alt={displayIdentity.displayName}
          />
          <Typography variant="h6" fontWeight="medium" noWrap>
            {displayIdentity.displayName}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: surfaceLineColor }} />

      <Box
        ref={messageListRef}
        onScroll={updateScrollStickiness}
        display="flex"
        flexDirection="column"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 3, py: 0.5 }}
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
                    opacity: item.pending ? 0.7 : 1,
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
                      gap: 0.5,
                      alignItems: 'center',
                      justifyContent: item.fromMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {item.pending ? (
                      <>
                        <AccessTime sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          Sending…
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          {formatThreadTime(item.message.createdAt)}
                        </Typography>
                        {item.fromMe && (
                          <Typography variant="caption" color={item.message.isRead ? 'primary.main' : 'text.secondary'}>
                            {item.message.isRead ? 'Read' : 'Sent'}
                          </Typography>
                        )}
                      </>
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
          <IconButton
            onClick={() => scrollToLatest('smooth')}
            aria-label="Jump to latest messages"
            sx={{
              width: 36,
              height: 36,
              border: '1px solid',
              borderColor: 'primary.main',
              color: 'primary.main',
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.08),
              },
            }}
          >
            <KeyboardArrowDown />
          </IconButton>
        </Box>
      )}

      <Divider sx={{ my: 2, borderColor: surfaceLineColor }} />
    </>
  );
}

interface MessageThreadErrorProps {
  username: string;
}

export function MessageThreadError({ username: _username }: MessageThreadErrorProps) {
  return (
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
  );
}
