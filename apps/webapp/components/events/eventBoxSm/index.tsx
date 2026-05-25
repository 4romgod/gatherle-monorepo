'use client';

import CardMedia from '@mui/material/CardMedia';
import { alpha, Avatar, AvatarGroup, Box, CardContent, Typography, Tooltip, Stack } from '@mui/material';
import { CalendarToday, LocationOn, CheckBoxRounded } from '@mui/icons-material';
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
  getEventPreviewScheduleText,
  getEventPreviewSlug,
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';
import type { EventParticipantRecord } from '@/components/events/participant-utils';

export default function EventBoxSm({ event, href }: { event: AnyEventPreview; href?: string }) {
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

  const activeParticipants = participantList.filter(
    (participant) => participant.status !== ParticipantStatus.Cancelled,
  );
  const visibleParticipants = activeParticipants.slice(0, 3);
  const getParticipantLabel = (participant: EventParticipantRecord) => {
    const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);

    const fallbackName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
    return nameParts.length ? nameParts.join(' ') : fallbackName;
  };
  const getParticipantAvatarLetter = (participant: EventParticipantRecord) =>
    participant.user?.given_name?.charAt(0) ??
    participant.user?.username?.charAt(0) ??
    participant.userId?.charAt(0) ??
    '?';

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
            paddingTop: '52%',
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
                objectFit: 'contain',
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.35)} 0%, ${alpha(
                  theme.palette.secondary.light,
                  0.35,
                )} 100%)`,
                color: 'text.secondary',
              })}
            >
              <CalendarToday sx={{ fontSize: 36, opacity: 0.7 }} />
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 1.25 }}>
          <Box
            sx={(theme) => ({
              alignSelf: 'flex-start',
              px: 1,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.light, 0.16),
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              mb: 1,
            })}
          >
            {cityLabel}
          </Box>
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

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {participantCount > 0 && (
              <>
                <CheckBoxRounded fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                  {participantCount} going
                </Typography>
              </>
            )}
            <AvatarGroup
              max={3}
              sx={{
                ml: 1,
                '& .MuiAvatar-root': { width: 26, height: 26, fontSize: '0.7rem' },
              }}
            >
              {visibleParticipants.map((participant) => (
                <Tooltip
                  key={participant.participantId}
                  title={`${getParticipantLabel(participant)} · ${participant.status}`}
                >
                  <Avatar src={participant.user?.profile_picture || undefined}>
                    {getParticipantAvatarLetter(participant).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 'auto' }}>
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
