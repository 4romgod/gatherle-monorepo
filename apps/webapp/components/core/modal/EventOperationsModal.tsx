'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import Link from 'next/link';
import { deleteEventAction } from '@/data/actions/server/events/delete-event';
import type { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { useSession } from 'next-auth/react';
import { buildEventOccurrenceHref } from '@/components/events/occurrence-url';

type EventOperationsOccurrenceTarget = {
  originalStartAt?: Date | string | null;
  startAt?: Date | string | null;
};

const EventOperationsModal = ({
  event,
  redirectOnDelete,
  canEditEvent = true,
  buttonSx,
  selectedOccurrence,
}: {
  event: EventDetail;
  redirectOnDelete?: string;
  canEditEvent?: boolean;
  buttonSx?: SxProps<Theme>;
  selectedOccurrence?: EventOperationsOccurrenceTarget | null;
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setToastProps, toastProps } = useAppContext();

  useEffect(() => {
    return () => {
      if (linkCopiedTimeoutRef.current) {
        clearTimeout(linkCopiedTimeoutRef.current);
      }
    };
  }, []);

  const appendActionParam = (href: string, action: 'cancel' | 'edit') => {
    const [pathname, search = ''] = href.split('?');
    const searchParams = new URLSearchParams(search);
    searchParams.set('action', action);
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const buildSessionsHref = (action?: 'cancel' | 'edit') => {
    const baseHref = selectedOccurrence
      ? buildEventOccurrenceHref(ROUTES.ACCOUNT.EVENTS.SESSIONS(event.slug), selectedOccurrence)
      : ROUTES.ACCOUNT.EVENTS.SESSIONS(event.slug);

    if (!selectedOccurrence || !action) {
      return baseHref;
    }

    return appendActionParam(baseHref, action);
  };

  const sessionsHref = buildSessionsHref();
  const editSessionHref = buildSessionsHref('edit');
  const cancelSessionHref = buildSessionsHref('cancel');
  const publicEventHref = selectedOccurrence
    ? buildEventOccurrenceHref(ROUTES.EVENTS.EVENT(event.slug), selectedOccurrence)
    : ROUTES.EVENTS.EVENT(event.slug);
  const copyLinkLabel = selectedOccurrence ? 'Copy Event Session Link' : 'Copy Event Series Link';
  const copyLinkDescription = selectedOccurrence
    ? 'Share the public link for this session'
    : 'Share the public link for this series';

  const handleMenuClose = () => {
    if (linkCopiedTimeoutRef.current) {
      clearTimeout(linkCopiedTimeoutRef.current);
      linkCopiedTimeoutRef.current = null;
    }
    setLinkCopied(false);
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${publicEventHref}` : publicEventHref;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      if (linkCopiedTimeoutRef.current) {
        clearTimeout(linkCopiedTimeoutRef.current);
      }
      linkCopiedTimeoutRef.current = setTimeout(() => {
        setLinkCopied(false);
        linkCopiedTimeoutRef.current = null;
      }, 2000);
    } catch {
      setToastProps({ ...toastProps, open: true, severity: 'error', message: 'Failed to copy link.' });
    }
    setMenuOpen(false);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    const deleteResponse = await deleteEventAction(event.eventId);
    setDeleting(false);

    if (deleteResponse.apiError) {
      setToastProps({ ...toastProps, open: true, severity: 'error', message: deleteResponse.apiError });
      setConfirmDeleteOpen(false);
      return;
    }

    if (deleteResponse.message) {
      setToastProps({ ...toastProps, open: true, severity: 'success', message: deleteResponse.message });
    }

    setConfirmDeleteOpen(false);
    handleMenuClose();
    const fallback = session?.user?.username ? ROUTES.USERS.USER(session.user.username) : ROUTES.HOME;
    router.replace(redirectOnDelete ?? fallback);
  };

  return (
    <>
      <IconButton onClick={() => setMenuOpen(true)} aria-label="Event options" size="small" sx={buttonSx}>
        <MoreVertIcon />
      </IconButton>

      {/* Operations menu dialog */}
      <Dialog
        open={menuOpen}
        onClose={handleMenuClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, overflow: 'hidden' },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            pt: 2,
            pb: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Event Tools
          </Typography>
          <IconButton size="small" onClick={handleMenuClose} aria-label="Close menu">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <List disablePadding>
            {canEditEvent ? (
              <ListItemButton
                component={Link}
                href={sessionsHref}
                onClick={handleMenuClose}
                sx={{ px: 2.5, py: 1.5, gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 'unset' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="Manage Event Sessions"
                  secondary="Inspect, reschedule, cancel, or split sessions"
                  slotProps={{
                    primary: { fontWeight: 600 },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            ) : null}

            {canEditEvent && selectedOccurrence ? (
              <ListItemButton
                component={Link}
                href={editSessionHref}
                onClick={handleMenuClose}
                sx={{ px: 2.5, py: 1.5, gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 'unset' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="Edit Event Session"
                  secondary="Adjust the currently selected session"
                  slotProps={{
                    primary: { fontWeight: 600 },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            ) : null}

            {canEditEvent ? (
              <ListItemButton
                component={Link}
                href={ROUTES.ACCOUNT.EVENTS.EDIT_EVENT(event.slug)}
                onClick={handleMenuClose}
                sx={{ px: 2.5, py: 1.5, gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 'unset' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="Edit Event Series"
                  secondary="Update series details and recurrence"
                  slotProps={{
                    primary: { fontWeight: 600 },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            ) : null}

            {/* Copy Link */}
            <ListItemButton onClick={handleCopyLink} sx={{ px: 2.5, py: 1.5, gap: 2 }}>
              <ListItemIcon sx={{ minWidth: 'unset' }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: linkCopied ? 'success.main' : 'action.selected',
                    color: linkCopied ? 'success.contrastText' : 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {linkCopied ? <CheckIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={linkCopied ? 'Link Copied!' : copyLinkLabel}
                secondary={copyLinkDescription}
                slotProps={{
                  primary: { fontWeight: 600 },
                  secondary: { variant: 'caption' },
                }}
              />
            </ListItemButton>

            {canEditEvent && selectedOccurrence ? <Divider sx={{ my: 0.5 }} /> : null}

            {canEditEvent && selectedOccurrence ? (
              <ListItemButton
                component={Link}
                href={cancelSessionHref}
                onClick={handleMenuClose}
                sx={{ px: 2.5, py: 1.5, gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 'unset' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: 'warning.main',
                      color: 'warning.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="Cancel Event Session"
                  secondary="Cancel only the selected session"
                  slotProps={{
                    primary: { sx: { fontWeight: 600, color: 'warning.dark' } },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            ) : null}

            {canEditEvent ? <Divider sx={{ my: 0.5 }} /> : null}

            {canEditEvent ? (
              <ListItemButton
                onClick={() => {
                  handleMenuClose();
                  setConfirmDeleteOpen(true);
                }}
                sx={{ px: 2.5, py: 1.5, gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 'unset' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: 'error.main',
                      color: 'error.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="Delete Event Series"
                  secondary="Permanently remove this series and all generated sessions"
                  slotProps={{
                    primary: { sx: { fontWeight: 600, color: 'error.main' } },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            ) : null}
          </List>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this event series?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{event.title}</strong> and all of its generated sessions will be permanently removed. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={deleting}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            size="small"
            startIcon={
              deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon sx={{ fontSize: '1rem' }} />
            }
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventOperationsModal;
