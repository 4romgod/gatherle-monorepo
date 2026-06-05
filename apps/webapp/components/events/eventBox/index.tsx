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
  isEventPreviewRsvpClosed,
  getEventPreviewScheduleText,
  getEventPreviewSlug,
  getEventPreviewStatusLabel,
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';
import {
  buildParticipantSocialProof,
  getParticipantDisplayName,
  getParticipantInitial,
} from '@/components/events/participant-utils';

export default function EventBox({
  event,
  followingUserIds,
}: {
  event: AnyEventPreview;
  followingUserIds?: ReadonlySet<string>;
}) {
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
  const rsvpClosed = isEventPreviewRsvpClosed(event);

  const [isSaved, setIsSaved] = useState(nextSavedState);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(nextRsvpStatus);

  useEffect(() => {
    setIsSaved(nextSavedState);
  }, [nextSavedState]);

  useEffect(() => {
    setRsvpStatus(nextRsvpStatus);
  }, [nextRsvpStatus]);

  const socialProof = buildParticipantSocialProof(participantList, {
    counts: { totalCount: participantCount },
    followingUserIds,
  });
  const rsvpLabel = rsvpClosed
    ? 'Event ended'
    : rsvpStatus === ParticipantStatus.Going
      ? 'Going'
      : rsvpStatus === ParticipantStatus.Interested
        ? 'Interested'
        : 'RSVP';
  const rsvpButtonSx = {
    minHeight: 38,
    borderRadius: 2,
    px: 1.5,
    fontSize: '0.78rem',
    boxShadow: 'none',
    ...(rsvpClosed
      ? {
          bgcolor: 'action.hover',
          borderColor: 'divider',
          color: 'text.secondary',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'divider',
            color: 'text.secondary',
          },
        }
      : rsvpStatus === ParticipantStatus.Going
        ? {
            bgcolor: 'success.lighter',
            borderColor: 'success.main',
            color: 'success.main',
            '&:hover': {
              bgcolor: 'success.light',
              borderColor: 'success.main',
              color: 'success.dark',
            },
          }
        : rsvpStatus === ParticipantStatus.Interested
          ? {
              bgcolor: 'primary.lighter',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
                borderColor: 'primary.main',
                color: 'primary.dark',
              },
            }
          : {
              bgcolor: 'secondary.main',
              borderColor: 'secondary.main',
              color: 'secondary.contrastText',
              '&:hover': {
                bgcolor: 'secondary.dark',
                borderColor: 'secondary.dark',
              },
            }),
  } as const;

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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.9, minHeight: 26 }}>
            {socialProof.participants.length > 0 ? (
              <AvatarGroup
                max={3}
                sx={{
                  '& .MuiAvatar-root': {
                    width: 24,
                    height: 24,
                    fontSize: '0.68rem',
                    border: '2px solid',
                    borderColor: 'background.paper',
                  },
                }}
              >
                {socialProof.participants.map((participant) => (
                  <Tooltip
                    key={participant.participantId}
                    title={`${getParticipantDisplayName(participant)} • ${participant.status}`}
                    arrow
                  >
                    <Avatar src={participant.user?.profile_picture || undefined}>
                      {getParticipantInitial(participant).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            ) : null}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {socialProof.text}
            </Typography>
          </Box>

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', width: '100%' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <RsvpButton
                eventId={eventId}
                occurrenceId={occurrenceId}
                currentStatus={rsvpStatus}
                fullWidth
                label={rsvpLabel}
                rsvpClosed={rsvpClosed}
                size="small"
                onRsvpChange={setRsvpStatus}
                sx={rsvpButtonSx}
              />
            </Box>
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
          </Box>
        </Box>
      </Box>
    </Surface>
  );
}
