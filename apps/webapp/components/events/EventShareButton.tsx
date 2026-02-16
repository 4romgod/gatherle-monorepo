'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  alpha,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import { CheckCircle, LinkRounded, Search, ShareRounded, Close } from '@mui/icons-material';
import { FaEnvelope, FaFacebookF, FaWhatsapp } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { type IconType } from 'react-icons';
import { GetAllUsersDocument, type QueryOptionsInput } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { useChatRealtime } from '@/hooks';

interface EventShareButtonProps {
  eventTitle: string;
  eventSlug?: string;
  eventUrl?: string;
  size?: 'small' | 'medium' | 'large';
  ariaLabel?: string;
  stopPropagation?: boolean;
  sx?: SxProps<Theme>;
}

type ShareUser = {
  userId: string;
  username?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  profile_picture?: string | null;
};

const USER_SEARCH_FIELDS = ['username', 'email', 'given_name', 'family_name'];
const SEARCH_DEBOUNCE_MS = 220;

const getDisplayName = (user: ShareUser): string => {
  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || 'Unknown';
};

const getInitial = (user: ShareUser): string =>
  (user.given_name?.charAt(0) ?? user.family_name?.charAt(0) ?? user.username?.charAt(0) ?? '?').toUpperCase();

const launchExternalShare = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

interface PlatformAction {
  key: string;
  label: string;
  icon?: IconType;
  muiIcon?: ReactNode;
  bgColor: string;
  fgColor: string;
  onClick: () => void;
}

export default function EventShareButton({
  eventTitle,
  eventSlug,
  eventUrl,
  size = 'small',
  ariaLabel,
  stopPropagation = false,
  sx,
}: EventShareButtonProps) {
  const isLarge = size === 'large';
  const { data: session } = useSession();
  const token = session?.user?.token;
  const currentUserId = session?.user?.userId;

  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [loadUsers, { data, loading }] = useLazyQuery(GetAllUsersDocument, {
    fetchPolicy: 'network-only',
  });

  const { sendChatMessage } = useChatRealtime({ enabled: open });

  const resolvedEventUrl = useMemo(() => {
    if (eventUrl) {
      return eventUrl;
    }

    const path = eventSlug ? `/events/${eventSlug}` : '/events';
    if (typeof window === 'undefined') {
      return path;
    }
    return `${window.location.origin}${path}`;
  }, [eventSlug, eventUrl]);

  const users = useMemo(() => {
    const allUsers = (data?.readUsers ?? []) as ShareUser[];
    return allUsers.filter((user) => user.userId !== currentUserId);
  }, [currentUserId, data?.readUsers]);

  const loadShareUsers = useCallback(
    async (term: string) => {
      const trimmedTerm = term.trim();
      const options: QueryOptionsInput = {
        pagination: { limit: 56 },
      };

      if (trimmedTerm) {
        options.search = {
          fields: USER_SEARCH_FIELDS,
          value: trimmedTerm,
        };
      }

      await loadUsers({
        variables: { options },
        context: {
          headers: getAuthHeader(token),
        },
      });
    },
    [loadUsers, token],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadShareUsers('');
  }, [loadShareUsers, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadShareUsers(searchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [loadShareUsers, open, searchValue]);

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  const openDialog = (clickEvent: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    }
    setOpen(true);
  };

  const stopDialogClickBubbling = (event: MouseEvent<HTMLElement>) => {
    if (!stopPropagation) {
      return;
    }
    event.stopPropagation();
  };

  const closeDialog = () => {
    setOpen(false);
    setSearchValue('');
    setSelectedUserIds(new Set());
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const messagePayload = `${eventTitle}\n${resolvedEventUrl}`;

  const handleSendSelected = () => {
    if (selectedUserIds.size === 0) {
      return;
    }

    let sentCount = 0;
    const selectedIds = Array.from(selectedUserIds);
    selectedIds.forEach((recipientUserId) => {
      const sent = sendChatMessage(recipientUserId, messagePayload);
      if (sent) {
        sentCount += 1;
      }
    });

    if (sentCount === 0) {
      showFeedback('Chat is not connected yet. Try again in a moment.');
      return;
    }

    setSentUserIds((previous) => {
      const next = new Set(previous);
      selectedIds.forEach((userId) => next.add(userId));
      return next;
    });

    setSelectedUserIds(new Set());
    showFeedback(`Sent to ${sentCount} ${sentCount === 1 ? 'person' : 'people'}.`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resolvedEventUrl);
      showFeedback('Link copied.');
    } catch {
      showFeedback('Unable to copy link.');
    }
  };

  const encodedUrl = encodeURIComponent(resolvedEventUrl);
  const encodedSummary = encodeURIComponent(`Check out this event: ${eventTitle}`);
  const encodedWhatsAppText = encodeURIComponent(`Check out this event: ${eventTitle}\n${resolvedEventUrl}`);

  const platformActions: PlatformAction[] = [
    {
      key: 'copy',
      label: 'Copy link',
      muiIcon: <LinkRounded fontSize="small" />,
      bgColor: '#272f3f',
      fgColor: '#dce3f4',
      onClick: handleCopyLink,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: FaWhatsapp,
      bgColor: '#1fa958',
      fgColor: '#ffffff',
      onClick: () => launchExternalShare(`https://wa.me/?text=${encodedWhatsAppText}`),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: FaFacebookF,
      bgColor: '#1877f2',
      fgColor: '#ffffff',
      onClick: () => launchExternalShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      key: 'x',
      label: 'X',
      icon: FaXTwitter,
      bgColor: '#0f1419',
      fgColor: '#ffffff',
      onClick: () => launchExternalShare(`https://x.com/intent/tweet?text=${encodedSummary}&url=${encodedUrl}`),
    },
    {
      key: 'email',
      label: 'Email',
      icon: FaEnvelope,
      bgColor: '#4a4f5f',
      fgColor: '#ffffff',
      onClick: () =>
        launchExternalShare(
          `mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(
            `Check out this event:\n${eventTitle}\n${resolvedEventUrl}`,
          )}`,
        ),
    },
  ];

  const selectedCount = selectedUserIds.size;

  return (
    <>
      <Tooltip title="Share event" arrow>
        <IconButton
          size={size}
          data-card-interactive="true"
          onClick={openDialog}
          aria-label={ariaLabel ?? `Share ${eventTitle}`}
          sx={{
            width: isLarge ? 48 : 28,
            height: isLarge ? 48 : 28,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'secondary.main',
              color: 'secondary.main',
              backgroundColor: 'secondary.lighter',
            },
            ...sx,
          }}
        >
          <ShareRounded sx={{ fontSize: isLarge ? 22 : 16 }} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={closeDialog}
        onClick={stopDialogClickBubbling}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <IconButton
                onClick={closeDialog}
                aria-label="Close share dialog"
                sx={{ color: 'text.secondary', width: 34, height: 34 }}
              >
                <Close />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Share
              </Typography>
              <Button
                size="small"
                variant="contained"
                disabled={selectedCount === 0}
                onClick={handleSendSelected}
                sx={{
                  minWidth: 78,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: selectedCount ? 'primary.main' : undefined,
                }}
              >
                {selectedCount > 0 ? `Send (${selectedCount})` : 'Send'}
              </Button>
            </Box>

            <TextField
              fullWidth
              size="small"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  backgroundColor: 'background.default',
                  color: 'text.primary',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'text.secondary',
                  opacity: 1,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
              }}
            />
          </Box>

          <Box
            sx={{
              px: 2,
              pb: 1.25,
              minHeight: 260,
              maxHeight: 420,
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={26} />
              </Box>
            ) : users.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                {searchValue.trim() ? 'No users found.' : 'No users to share with yet.'}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 1.75,
                }}
              >
                {users.map((user) => {
                  const selected = selectedUserIds.has(user.userId);
                  const wasSent = sentUserIds.has(user.userId);

                  return (
                    <Box
                      key={user.userId}
                      onClick={() => toggleUserSelection(user.userId)}
                      sx={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        p: 0.75,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: selected ? 'primary.main' : 'transparent',
                        backgroundColor: selected ? 'action.selected' : 'transparent',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Badge
                        overlap="circular"
                        badgeContent={
                          selected ? (
                            <CheckCircle
                              sx={{
                                color: 'primary.main',
                                backgroundColor: 'background.paper',
                                borderRadius: '50%',
                              }}
                            />
                          ) : null
                        }
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar
                          src={user.profile_picture || undefined}
                          sx={{
                            width: 66,
                            height: 66,
                            mx: 'auto',
                            border: '2px solid',
                            borderColor: wasSent ? 'primary.main' : 'divider',
                          }}
                        >
                          {getInitial(user)}
                        </Avatar>
                      </Badge>

                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          fontWeight: 500,
                          lineHeight: 1.25,
                          color: 'text.primary',
                          minHeight: 36,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {getDisplayName(user)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Box
            sx={{
              px: 2,
              pt: 1.25,
              pb: 1.75,
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
              overflowX: 'auto',
            }}
          >
            <Stack direction="row" spacing={1.25}>
              {platformActions.map((action) => {
                const BrandIcon = action.icon;
                return (
                  <Box
                    key={action.key}
                    sx={{
                      width: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      flexShrink: 0,
                    }}
                  >
                    <IconButton
                      onClick={action.onClick}
                      aria-label={action.label}
                      sx={{
                        width: 46,
                        height: 46,
                        mx: 'auto',
                        color: action.fgColor,
                        backgroundColor: action.bgColor,
                        border: '1px solid',
                        borderColor: alpha('#ffffff', 0.12),
                        '&:hover': {
                          opacity: 0.9,
                          backgroundColor: action.bgColor,
                        },
                      }}
                    >
                      {BrandIcon ? <BrandIcon size={18} /> : action.muiIcon}
                    </IconButton>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.55,
                        color: 'text.secondary',
                        lineHeight: 1.15,
                        minHeight: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        width: '100%',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {action.label}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={feedbackOpen}
        autoHideDuration={2800}
        onClose={() => setFeedbackOpen(false)}
        message={feedbackMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
