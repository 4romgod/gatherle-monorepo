'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { Avatar, AvatarGroup, IconButton, Tooltip, Typography, Chip, Stack, useTheme, alpha } from '@mui/material';
import { EventParticipantPreview, EventPreview } from '@/data/graphql/query/Event/types';
import { Box } from '@mui/material';
import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { ShareRounded, PeopleOutline } from '@mui/icons-material';
import { RRule } from 'rrule';
import { SaveEventButton, RsvpButton } from '@/components/events';
import { useState, useEffect } from 'react';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import Surface from '@/components/core/Surface';

export default function EventBox({ event }: { event: EventPreview }) {
  const theme = useTheme();
  const { title, recurrenceRule, participants, media, location, status } = event;

  // Local state for optimistic UI updates
  const [isSaved, setIsSaved] = useState(event.isSavedByMe ?? false);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(event.myRsvp?.status ?? null);

  // Sync state when props change (e.g., after refetch)
  useEffect(() => {
    setIsSaved(event.isSavedByMe ?? false);
  }, [event.isSavedByMe]);

  useEffect(() => {
    setRsvpStatus(event.myRsvp?.status ?? null);
  }, [event.myRsvp?.status]);

  const recurrenceText = RRule.fromString(recurrenceRule).toText();
  const imageUrl = media?.featuredImageUrl ?? null;
  const participantCount = participants?.length ?? 0;
  const participantList = (participants ?? []) as EventParticipantPreview[];
  const visibleParticipants = participantList.slice(0, 3);

  const getParticipantLabel = (participant: EventParticipantPreview) => {
    const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);

    const displayName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
    return nameParts.length ? nameParts.join(' ') : displayName;
  };

  const getParticipantAvatarLetter = (participant: EventParticipantPreview) =>
    participant.user?.given_name?.charAt(0) ??
    participant.user?.username?.charAt(0) ??
    participant.userId?.charAt(0) ??
    '?';

  const locationText = location?.address?.city || location?.details || 'Location TBA';

  return (
    <Surface
      component={Card}
      sx={{
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
        gridTemplateRows: { xs: 'auto auto', sm: '180px' },
        gap: 0,
        height: { xs: 'auto', sm: 180 },
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
          '& .event-image': {
            transform: 'scale(1.05)',
          },
          '& .event-overlay': {
            backgroundColor: alpha(theme.palette.common.black, 0.35),
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 140, sm: 180 },
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <CardMedia
            component="img"
            image={imageUrl}
            alt={title}
            className="event-image"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
          />
        ) : (
          <Box
            className="event-image"
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.35)} 0%, ${alpha(
                theme.palette.secondary.light,
                0.35,
              )} 100%)`,
              color: 'text.secondary',
              transition: 'transform 0.3s ease',
            }}
          >
            <PeopleOutline sx={{ fontSize: 40, opacity: 0.7 }} />
          </Box>
        )}
        <Box
          className="event-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.1)} 0%, ${alpha(theme.palette.common.black, 0.5)} 100%)`,
            transition: 'background-color 0.3s ease',
          }}
        />
        {status && (
          <Chip
            label={status}
            size="small"
            color="success"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
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
                {recurrenceText}
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
            <RsvpButton eventId={event.eventId} currentStatus={rsvpStatus} size="small" onRsvpChange={setRsvpStatus} />
            <SaveEventButton
              eventId={event.eventId}
              isSaved={isSaved}
              size="small"
              showTooltip
              onSaveChange={setIsSaved}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label={`Share ${title}`}
              sx={{
                width: 28,
                height: 28,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'secondary.main',
                  color: 'secondary.main',
                  backgroundColor: 'secondary.lighter',
                },
              }}
            >
              <ShareRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Surface>
  );
}
