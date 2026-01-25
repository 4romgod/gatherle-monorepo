'use client';

import { useState, useEffect } from 'react';
import { Stack } from '@mui/material';
import { SaveEventButton, RsvpButton } from '@/components/events';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import CopyLinkButton from '@/components/events/CopyLinkButton';
import Surface from '@/components/core/Surface';

interface EventDetailActionsProps {
  eventId: string;
  eventUrl: string;
  isSavedByMe: boolean;
  myRsvpStatus: ParticipantStatus | null;
}

/**
 * Client component for event detail page actions (Save, RSVP, Share).
 * Manages local state to reflect immediate UI updates after mutations.
 */
export default function EventDetailActions({ eventId, eventUrl, isSavedByMe, myRsvpStatus }: EventDetailActionsProps) {
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

  return (
    <Surface
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RsvpButton
          eventId={eventId}
          currentStatus={rsvpStatus}
          size="large"
          showTooltip={false}
          onRsvpChange={setRsvpStatus}
        />
        <SaveEventButton
          eventId={eventId}
          isSaved={isSaved}
          size="large"
          showTooltip={false}
          onSaveChange={setIsSaved}
        />
        <CopyLinkButton url={eventUrl} />
      </Stack>
    </Surface>
  );
}
