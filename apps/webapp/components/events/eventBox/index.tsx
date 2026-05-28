'use client';

import { Avatar, AvatarGroup, Tooltip, Typography, Chip, Stack, useTheme, alpha } from '@mui/material';
import { Box } from '@mui/material';
import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { PeopleOutline } from '@mui/icons-material';
import { SaveEventButton, RsvpButton } from '@/components/events';
import { useState, useEffect } from 'react';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import Surface from '@/components/core/Surface';
import RemoteImage from '@/components/core/RemoteImage';
import EventShareButton from '@/components/events/share/EventShareButton';
import {
  AnyEventPreview,
  getEventPreviewEventId,
  getEventPreviewHref,
  getEventPreviewImageUrl,
  getEventPreviewIsSavedByMe,
  getEventPreviewLocationText,
  getEventPreviewMyRsvpStatus,
  getEventPreviewOccurrenceId,
  getEventPreviewParticipantCount,
  getEventPreviewParticipants,
  getEventPreviewScheduleText,
  getEventPreviewSlug,
  getEventPreviewStatusLabel,
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';
import type { EventParticipantRecord } from '@/components/events/participant-utils';

export default function EventBox({ event }: { event: AnyEventPreview }) {
  const theme = useTheme();
  const title = getEventPreviewTitle(event);
  const eventId = getEventPreviewEventId(event);
  const occurrenceId = getEventPreviewOccurrenceId(event);
  const imageUrl = getEventPreviewImageUrl(event);
  const locationText = getEventPreviewLocationText(event);
  const scheduleText = getEventPreviewScheduleText(event);
  const statusLabel = getEventPreviewStatusLabel(event);
  const shareUrl = getEventPreviewHref(event);
  const eventSlug = getEventPreviewSlug(event);
  const nextSavedState = getEventPreviewIsSavedByMe(event);
  const nextRsvpStatus = getEventPreviewMyRsvpStatus(event);
  const participantList = getEventPreviewParticipants(event);
  const participantCount = getEventPreviewParticipantCount(event);

  const [isSaved, setIsSaved] = useState(nextSavedState);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(nextRsvpStatus);

  useEffect(() => {
    setIsSaved(nextSavedState);
  }, [nextSavedState]);

  useEffect(() => {
    setRsvpStatus(nextRsvpStatus);
  }, [nextRsvpStatus]);

  const activeParticipants = participantList.filter(
    (participant) => participant.status !== ParticipantStatus.Cancelled,
  );
  const visibleParticipants = activeParticipants.slice(0, 3);

  const getParticipantLabel = (participant: EventParticipantRecord) => {
    const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);

    const displayName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
    return nameParts.length ? nameParts.join(' ') : displayName;
  };

  const getParticipantAvatarLetter = (participant: EventParticipantRecord) =>
    participant.user?.given_name?.charAt(0) ??
    participant.user?.username?.charAt(0) ??
    participant.userId?.charAt(0) ??
    '?';

  return (
    <Surface
      disableShadow
      sx={{
        p: 0,
        backgroundColor: 'background.default',
        backgroundImage: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '240px minmax(0, 1fr)' },
        gridTemplateRows: { xs: 'auto auto', sm: 'auto' },
        gap: 0,
        height: 'auto',
        borderRadius: { xs: 1, sm: 2 },
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: alpha(theme.palette.primary.light, 0.08),
          alignSelf: 'start',
          position: 'relative',
          aspectRatio: '16 / 9',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <RemoteImage
          alt={title}
          className="event-image"
          fallback={
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme.palette.hero.gradient,
                color: theme.palette.hero.text,
              }}
            >
              <PeopleOutline sx={{ fontSize: 40, opacity: 0.82 }} />
            </Box>
          }
          imageSx={{
            objectFit: 'cover',
            position: 'relative',
            transition: 'none',
          }}
          showLoader
          src={imageUrl}
          sx={{ width: '100%', height: '100%' }}
        />
        {statusLabel && (
          <Chip
            label={statusLabel}
            size="small"
            color="success"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 1,
              fontWeight: 700,
            }}
          />
        )}
      </Box>
      <Box
        component="div"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 1.5,
          gap: 1,
          overflow: 'hidden',
          height: { xs: 'auto', sm: '100%' },
        }}
      >
        <Box sx={{ flex: '1 1 auto', overflow: 'hidden' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
            {participantCount > 0 && (
              <Chip
                icon={<PeopleOutline sx={{ fontSize: 14 }} />}
                label={`${participantCount} going`}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Stack>

          <Typography
            variant="body2"
            color="text.primary"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontSize: '0.9rem',
            }}
          >
            {title}
          </Typography>

          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarIcon height={14} width={14} style={{ color: 'inherit', opacity: 0.7, flexShrink: 0 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {scheduleText}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MapPinIcon height={14} width={14} style={{ color: 'inherit', opacity: 0.7, flexShrink: 0 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {locationText}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {participantCount > 0 && (
            <AvatarGroup
              max={3}
              sx={{
                display: { xs: 'flex', sm: 'none', lg: 'flex' },
                '& .MuiAvatar-root': {
                  width: 24,
                  height: 24,
                  fontSize: '0.7rem',
                  border: '2px solid',
                  borderColor: 'background.paper',
                },
              }}
            >
              {visibleParticipants.map((participant) => (
                <Tooltip
                  key={participant.participantId}
                  title={`${getParticipantLabel(participant)} • ${participant.status}`}
                  arrow
                >
                  <Avatar src={participant.user?.profile_picture || undefined}>
                    {getParticipantAvatarLetter(participant).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          )}

          <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
            <RsvpButton
              eventId={eventId}
              occurrenceId={occurrenceId}
              currentStatus={rsvpStatus}
              size="small"
              onRsvpChange={setRsvpStatus}
            />
            <SaveEventButton eventId={eventId} isSaved={isSaved} size="small" showTooltip onSaveChange={setIsSaved} />
            <EventShareButton
              eventTitle={title}
              eventSlug={eventSlug}
              eventUrl={shareUrl}
              stopPropagation
              size="small"
              sx={{
                width: 28,
                height: 28,
              }}
            />
          </Stack>
        </Box>
      </Box>
    </Surface>
  );
}
