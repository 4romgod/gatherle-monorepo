'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import { Button, IconButton, Tooltip, CircularProgress, Menu, MenuItem } from '@mui/material';
import { EventAvailable, EventAvailableOutlined, Star, Check, Cancel } from '@mui/icons-material';
import { useRsvp } from '@/hooks';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { logger, extractApolloErrorMessage } from '@/lib/utils';
import NProgress from 'nprogress';
import { useState, useRef } from 'react';

interface RsvpButtonProps {
  eventId: string;
  occurrenceId?: string;
  currentStatus: ParticipantStatus | null;
  rsvpClosed?: boolean;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onRsvpChange?: (status: ParticipantStatus | null) => void;
  label?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Icon button to RSVP to an event.
 * Click opens menu to select Going, Interested, or Cancel.
 */
export default function RsvpButton({
  eventId,
  occurrenceId,
  currentStatus,
  rsvpClosed = false,
  size = 'medium',
  showTooltip = true,
  onRsvpChange,
  label,
  fullWidth = false,
  sx,
}: RsvpButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setToastProps } = useAppContext();
  const { goingToEvent, interestedInEvent, cancelRsvp, isLoading } = useRsvp();
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const isGoing = currentStatus === ParticipantStatus.Going;
  const isInterested = currentStatus === ParticipantStatus.Interested;
  const hasRsvpd = isGoing || isInterested;
  const activeColor = isGoing ? 'success' : isInterested ? 'primary' : null;

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!session?.user?.token) {
      NProgress.start();
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    if (rsvpClosed) {
      return;
    }

    setMenuOpen(true);
  };

  const handleMenuClose = (e?: React.MouseEvent | object) => {
    if (e && 'stopPropagation' in e) {
      (e as React.MouseEvent).stopPropagation();
      (e as React.MouseEvent).preventDefault();
    }
    setMenuOpen(false);
  };

  const handleRsvp = async (status: ParticipantStatus | 'cancel', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);

    try {
      if (status === 'cancel') {
        await cancelRsvp(eventId, occurrenceId);
        onRsvpChange?.(null);
        setToastProps({
          open: true,
          message: 'RSVP cancelled',
          severity: 'info',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 2000,
        });
      } else if (status === ParticipantStatus.Going) {
        await goingToEvent(eventId, 1, occurrenceId);
        onRsvpChange?.(ParticipantStatus.Going);
        setToastProps({
          open: true,
          message: "You're going! 🎉",
          severity: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 2000,
        });
      } else if (status === ParticipantStatus.Interested) {
        await interestedInEvent(eventId, occurrenceId);
        onRsvpChange?.(ParticipantStatus.Interested);
        setToastProps({
          open: true,
          message: 'Marked as interested',
          severity: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 2000,
        });
      }
    } catch (error: unknown) {
      logger.error('Error updating RSVP:', error);

      const errorMessage = extractApolloErrorMessage(error, 'Failed to update RSVP. Please try again.');

      setToastProps({
        open: true,
        message: errorMessage,
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  const tooltipText = rsvpClosed ? 'Event ended' : hasRsvpd ? (isGoing ? 'Going' : 'Interested') : 'RSVP to this event';
  const icon = isLoading ? (
    <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 22} />
  ) : isGoing ? (
    <EventAvailable />
  ) : isInterested ? (
    <Star />
  ) : (
    <EventAvailableOutlined />
  );
  const mergeSx = (base: SxProps<Theme>): SxProps<Theme> => {
    if (!sx) {
      return base;
    }

    return Array.isArray(sx) ? ([base, ...sx] as SxProps<Theme>) : ([base, sx] as SxProps<Theme>);
  };
  const labeledButtonSx = mergeSx({
    minHeight: 52,
    borderRadius: 1,
    justifyContent: 'center',
    textTransform: 'none',
    fontWeight: 700,
    bgcolor: activeColor ? `${activeColor}.main` : 'transparent',
    borderColor: activeColor ? `${activeColor}.main` : 'divider',
    color: hasRsvpd ? 'common.white' : 'text.primary',
    '&:hover': {
      bgcolor: activeColor ? `${activeColor}.dark` : 'action.hover',
      borderColor: activeColor ? `${activeColor}.dark` : 'success.main',
    },
  });
  const iconButtonSx = mergeSx({
    color: activeColor ? `${activeColor}.main` : 'text.secondary',
    bgcolor: activeColor ? `${activeColor}.lighter` : 'transparent',
    '&:hover': {
      color: activeColor ? `${activeColor}.dark` : 'success.main',
      bgcolor: activeColor ? `${activeColor}.light` : 'action.hover',
    },
  });

  const button = label ? (
    <Button
      ref={anchorRef}
      disabled={isLoading || rsvpClosed}
      fullWidth={fullWidth}
      onClick={handleButtonClick}
      size={size}
      startIcon={icon}
      variant={hasRsvpd ? 'contained' : 'outlined'}
      sx={labeledButtonSx}
    >
      {label}
    </Button>
  ) : (
    <IconButton
      ref={anchorRef}
      onClick={handleButtonClick}
      disabled={isLoading || rsvpClosed}
      size={size}
      sx={iconButtonSx}
      aria-label={tooltipText}
    >
      {icon}
    </IconButton>
  );

  return (
    <>
      {showTooltip ? (
        <Tooltip title={tooltipText} arrow>
          {button}
        </Tooltip>
      ) : (
        button
      )}
      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { minWidth: 140 },
          },
        }}
      >
        <MenuItem onClick={(e) => handleRsvp(ParticipantStatus.Going, e)} selected={isGoing}>
          <EventAvailable sx={{ mr: 1, fontSize: 18 }} />
          Going
          {isGoing && <Check sx={{ ml: 'auto', fontSize: 18 }} color="success" />}
        </MenuItem>
        <MenuItem onClick={(e) => handleRsvp(ParticipantStatus.Interested, e)} selected={isInterested}>
          <Star sx={{ mr: 1, fontSize: 18 }} />
          Interested
          {isInterested && <Check sx={{ ml: 'auto', fontSize: 18 }} color="success" />}
        </MenuItem>
        {hasRsvpd && (
          <MenuItem onClick={(e) => handleRsvp('cancel', e)}>
            <Cancel sx={{ mr: 1, fontSize: 18 }} />
            Cancel RSVP
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
