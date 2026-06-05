'use client';

import CardMedia from '@mui/material/CardMedia';
import { alpha, Avatar, AvatarGroup, Box, CardContent, Typography, Tooltip, Stack } from '@mui/material';
import { CalendarToday, LocationOn } from '@mui/icons-material';
import Link from 'next/link';
import { SaveEventButton, EventShareButton, RsvpButton } from '@/components/events';
import { useState, useEffect, type MouseEvent } from 'react';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import {
  AnyEventPreview,
  getEventPreviewCityLabel,
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
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';
import {
  buildParticipantSocialProof,
  getParticipantDisplayName,
  getParticipantInitial,
} from '@/components/events/participant-utils';

export default function EventBoxSm({
  event,
  href,
  followingUserIds,
}: {
  event: AnyEventPreview;
  href?: string;
  followingUserIds?: ReadonlySet<string>;
}) {
  const title = getEventPreviewTitle(event);
  const resolvedHref = href || getEventPreviewHref(event);
  const eventId = getEventPreviewEventId(event);
  const occurrenceId = getEventPreviewOccurrenceId(event);
  const eventSlug = getEventPreviewSlug(event);
  const imageUrl = getEventPreviewImageUrl(event);
  const cityLabel = getEventPreviewCityLabel(event);
  const locationLabel = getEventPreviewLocationText(event);
  const scheduleText = getEventPreviewScheduleText(event);
  const nextSavedState = getEventPreviewIsSavedByMe(event);
  const nextRsvpStatus = getEventPreviewMyRsvpStatus(event);
  const participantList = getEventPreviewParticipants(event);
  const participantCount = getEventPreviewParticipantCount(event);
  const rsvpClosed = isEventPreviewRsvpClosed(event);

  // Local state for optimistic UI updates
  const [isSaved, setIsSaved] = useState(nextSavedState);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(nextRsvpStatus);

  // Sync state when props change (e.g., after refetch)
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
    minHeight: 34,
    borderRadius: 2,
    px: 1,
    fontSize: '0.74rem',
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

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = event.target as HTMLElement;
    const isInteractive = target.closest('button, [role="button"], [role="menuitem"], [data-card-interactive="true"]');

    if (isInteractive) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Link href={resolvedHref} onClick={handleLinkClick}>
      <Box
        sx={(theme) => ({
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease-in-out',
          overflow: 'hidden',
          borderColor: theme.palette.divider,
          borderRadius: { xs: 1, sm: 2 },
          minHeight: 240,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: theme.shadows[4],
            borderColor: theme.palette.primary.main,
          },
        })}
      >
        <Box
          sx={(theme) => ({
            position: 'relative',
            paddingTop: '56.25%',
            overflow: 'hidden',
            backgroundColor: alpha(theme.palette.primary.light, 0.08),
          })}
        >
          {imageUrl ? (
            <CardMedia
              component="img"
              image={imageUrl}
              alt={title}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme.palette.hero.gradient,
                color: theme.palette.hero.text,
              })}
            >
              <CalendarToday sx={{ fontSize: 36, opacity: 0.82 }} />
            </Box>
          )}
          <Box
            sx={(theme) => ({
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 1,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.light, 0.16),
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            })}
          >
            {cityLabel}
          </Box>
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 1.25 }}>
          <Typography gutterBottom variant="subtitle2" component="h2" fontWeight="bold" sx={{ mb: 0.4 }}>
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.4 }}>
            <CalendarToday fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {scheduleText}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.4 }}>
            <LocationOn fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {locationLabel}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, minHeight: 26 }}>
            {socialProof.participants.length > 0 ? (
              <AvatarGroup
                max={3}
                sx={{
                  '& .MuiAvatar-root': { width: 26, height: 26, fontSize: '0.7rem' },
                }}
              >
                {socialProof.participants.map((participant) => (
                  <Tooltip
                    key={participant.participantId}
                    title={`${getParticipantDisplayName(participant)} · ${participant.status}`}
                  >
                    <Avatar src={participant.user?.profile_picture || undefined}>
                      {getParticipantInitial(participant).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            ) : null}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.78rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {socialProof.text}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 'auto' }}>
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
              eventUrl={resolvedHref}
              stopPropagation
              size="small"
              sx={{
                width: 28,
                height: 28,
              }}
            />
          </Stack>
        </CardContent>
      </Box>
    </Link>
  );
}
