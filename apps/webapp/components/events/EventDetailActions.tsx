'use client';

import { useState, useEffect } from 'react';
import { Stack } from '@mui/material';
import { SaveEventButton, RsvpButton } from '@/components/events';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import Surface from '@/components/core/Surface';
import EventShareButton from '@/components/events/share/EventShareButton';

interface EventDetailActionsProps {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventUrl: string;
  isSavedByMe: boolean;
  myRsvpStatus: ParticipantStatus | null;
  /**
   * When true, renders in a compact bare layout without Surface card styling.
   * Used for the mobile sticky action bar where the outer Paper already provides
   * the visual container.
   */
  compact?: boolean;
}

/**
 * Client component for event detail page actions (Save, RSVP, Share).
 * Manages local state to reflect immediate UI updates after mutations.
 */
export default function EventDetailActions({
  eventId,
  eventTitle,
  eventSlug,
  eventUrl,
  isSavedByMe,
  myRsvpStatus,
  compact = false,
}: EventDetailActionsProps) {
  // Local state for immediate UI feedback
  const [isSaved, setIsSaved] = useState(isSavedByMe);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(myRsvpStatus);

  // Sync with props when they change (e.g., after navigation)
  useEffect(() => {
    setIsSaved(isSavedByMe);
  }, [isSavedByMe]);

  useEffect(() => {
    setRsvpStatus(myRsvpStatus);
  }, [myRsvpStatus]);

  const actions = (
    <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
      <RsvpButton
        eventId={eventId}
        currentStatus={rsvpStatus}
        size={compact ? 'medium' : 'large'}
        showTooltip={false}
        onRsvpChange={setRsvpStatus}
      />
      <SaveEventButton
        eventId={eventId}
        isSaved={isSaved}
        size={compact ? 'medium' : 'large'}
        showTooltip={false}
        onSaveChange={setIsSaved}
      />
      <EventShareButton
        eventTitle={eventTitle}
        eventSlug={eventSlug}
        eventUrl={eventUrl}
        size={compact ? 'medium' : 'large'}
      />
    </Stack>
  );

  if (compact) {
    return actions;
  }

  return (
    <Surface
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
      }}
    >
      {actions}
    </Surface>
  );
}
