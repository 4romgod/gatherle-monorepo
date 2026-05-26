'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import { Button, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Bookmark, BookmarkBorder } from '@mui/icons-material';
import { useSaveEvent } from '@/hooks';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { logger, extractApolloErrorMessage } from '@/lib/utils';
import NProgress from 'nprogress';

interface SaveEventButtonProps {
  eventId: string;
  isSaved: boolean;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onSaveChange?: (isSaved: boolean) => void;
  label?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Button to save/unsave (bookmark) an event.
 * Uses the Follow system under the hood with targetType = Event.
 */
export default function SaveEventButton({
  eventId,
  isSaved,
  size = 'medium',
  showTooltip = true,
  onSaveChange,
  label,
  fullWidth = false,
  sx,
}: SaveEventButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setToastProps } = useAppContext();
  const { toggleSave, isLoading } = useSaveEvent();

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event card click
    e.preventDefault();

    if (!session?.user?.token) {
      NProgress.start();
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    try {
      await toggleSave(eventId, isSaved);
      onSaveChange?.(!isSaved);

      setToastProps({
        open: true,
        message: isSaved ? 'Event removed from saved' : 'Event saved!',
        severity: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 2000,
      });
    } catch (error: unknown) {
      logger.error('Error toggling save status:', error);

      const defaultMessage = isSaved
        ? 'Failed to unsave event. Please try again.'
        : 'Failed to save event. Please try again.';
      const errorMessage = extractApolloErrorMessage(error, defaultMessage);

      setToastProps({
        open: true,
        message: errorMessage,
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  const icon = isLoading ? (
    <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 22} />
  ) : isSaved ? (
    <Bookmark />
  ) : (
    <BookmarkBorder />
  );
  const mergeSx = (base: SxProps<Theme>): SxProps<Theme> => {
    if (!sx) {
      return base;
    }

    return Array.isArray(sx) ? ([base, ...sx] as SxProps<Theme>) : ([base, sx] as SxProps<Theme>);
  };
  const labeledButtonSx = mergeSx({
    minHeight: 52,
    borderRadius: 3,
    justifyContent: 'center',
    textTransform: 'none',
    fontWeight: 700,
    bgcolor: isSaved ? 'primary.main' : 'transparent',
    borderColor: isSaved ? 'primary.main' : 'divider',
    color: isSaved ? 'common.white' : 'text.primary',
    '&:hover': {
      bgcolor: isSaved ? 'primary.dark' : 'action.hover',
      borderColor: isSaved ? 'primary.dark' : 'primary.main',
    },
  });
  const iconButtonSx = mergeSx({
    color: isSaved ? 'primary.main' : 'text.secondary',
    bgcolor: isSaved ? 'primary.lighter' : 'transparent',
    '&:hover': {
      color: isSaved ? 'primary.dark' : 'primary.main',
      bgcolor: isSaved ? 'primary.light' : 'action.hover',
    },
  });

  const button = label ? (
    <Button
      disabled={isLoading}
      fullWidth={fullWidth}
      onClick={handleToggleSave}
      size={size}
      startIcon={icon}
      variant={isSaved ? 'contained' : 'outlined'}
      sx={labeledButtonSx}
    >
      {label}
    </Button>
  ) : (
    <IconButton onClick={handleToggleSave} disabled={isLoading} size={size} sx={iconButtonSx}>
      {icon}
    </IconButton>
  );

  if (showTooltip) {
    return <Tooltip title={isSaved ? 'Remove from saved' : 'Save event'}>{button}</Tooltip>;
  }

  return button;
}
