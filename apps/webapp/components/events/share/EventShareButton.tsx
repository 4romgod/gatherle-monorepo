'use client';

import { useMemo, type MouseEvent } from 'react';
import { Button, IconButton, Snackbar, Tooltip } from '@mui/material';
import { ShareRounded } from '@mui/icons-material';
import type { EventShareButtonProps } from '.';
import { useShareDialog } from '@/hooks/useShareDialog';
import { ShareDialog } from '.';

export default function EventShareButton({
  eventTitle,
  eventSlug,
  eventUrl,
  size = 'small',
  ariaLabel,
  stopPropagation = false,
  sx,
  label,
  fullWidth = false,
}: EventShareButtonProps) {
  const isLarge = size === 'large';

  const resolvedEventUrl = useMemo(() => {
    const path = eventUrl || (eventSlug ? `/events/${eventSlug}` : '/events');
    if (typeof window === 'undefined') {
      return path;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${window.location.origin}${path}`;
  }, [eventSlug, eventUrl]);

  const share = useShareDialog({ eventTitle, resolvedEventUrl });

  const handleOpen = (clickEvent: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    }
    share.openDialog();
  };

  const icon = <ShareRounded sx={{ fontSize: isLarge ? 22 : 16 }} />;

  return (
    <>
      <Tooltip title="Share event" arrow>
        {label ? (
          <Button
            aria-label={ariaLabel ?? `Share ${eventTitle}`}
            data-card-interactive="true"
            fullWidth={fullWidth}
            onClick={handleOpen}
            size={size}
            startIcon={icon}
            variant="outlined"
            sx={{
              minHeight: 52,
              borderRadius: 3,
              justifyContent: 'center',
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'secondary.main',
                color: 'secondary.main',
                backgroundColor: 'secondary.lighter',
              },
              ...sx,
            }}
          >
            {label}
          </Button>
        ) : (
          <IconButton
            size={size}
            data-card-interactive="true"
            onClick={handleOpen}
            aria-label={ariaLabel ?? `Share ${eventTitle}`}
            sx={{
              width: isLarge ? 48 : 28,
              height: isLarge ? 48 : 28,
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'secondary.main',
                color: 'secondary.main',
                backgroundColor: 'secondary.lighter',
              },
              ...sx,
            }}
          >
            {icon}
          </IconButton>
        )}
      </Tooltip>

      <ShareDialog
        open={share.open}
        onClose={share.closeDialog}
        stopPropagation={stopPropagation}
        eventTitle={eventTitle}
        resolvedEventUrl={resolvedEventUrl}
        searchValue={share.searchValue}
        onSearchChange={share.setSearchValue}
        users={share.users}
        loading={share.loading}
        selectedUserIds={share.selectedUserIds}
        sentUserIds={share.sentUserIds}
        onToggleUser={share.toggleUserSelection}
        onSend={share.handleSendSelected}
        onCopyLink={share.handleCopyLink}
      />

      <Snackbar
        open={share.feedbackOpen}
        autoHideDuration={2800}
        onClose={share.closeFeedback}
        message={share.feedbackMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
