'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { Avatar, AvatarGroup, CardContent, Typography, Tooltip } from '@mui/material';
import { EventParticipantPreview, EventPreview } from '@/data/graphql/query/Event/types';
import { Box } from '@mui/material';
import { CalendarToday, LocationOn, CheckBoxRounded } from '@mui/icons-material';
import { RRule } from 'rrule';
import Link from 'next/link';

export default function EventBoxSm({ event, href }: { event: EventPreview; href?: string }) {
  const { recurrenceRule, participants, location, media, heroImage } = event;

  const recurrenceText = (() => {
    if (!recurrenceRule) {
      return 'Single occurrence';
    }
    try {
      return RRule.fromString(recurrenceRule).toText();
    } catch {
      return 'Custom recurrence';
    }
  })();

  // TODO: This placeholder image is just for development purposes
  const imageUrl = heroImage
    || media?.featuredImageUrl
    || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80';

  const cityLabel = location?.address?.city || 'Featured';
  const locationLabel = location?.address ? `${location.address.country}, ${location.address.city}` : 'Location TBA';
  const participantCount = participants?.length ?? 0;
  const participantList = (participants ?? []) as EventParticipantPreview[];
  const visibleParticipants = participantList.slice(0, 3);
  const getParticipantLabel = (participant: EventParticipantPreview) => {
    const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);

    const fallbackName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
    return nameParts.length ? nameParts.join(' ') : fallbackName;
  };
  const getParticipantAvatarLetter = (participant: EventParticipantPreview) =>
    participant.user?.given_name?.charAt(0) ??
    participant.user?.username?.charAt(0) ??
    participant.userId?.charAt(0) ??
    '?';

  return (
    <Link href={href || `/events/${event.slug}`}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          transition: 'all 0.25s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          borderRadius: 2,
          overflow: 'hidden',
          minHeight: 240,
        }}
      >
        <Box sx={{ position: 'relative', paddingTop: '52%', overflow: 'hidden' }}>
          <CardMedia
            component="img"
            image={imageUrl}
            alt={event.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.92)',
              color: 'primary.dark',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {cityLabel}
          </Box>
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 1.25 }}>
          <Typography gutterBottom variant="subtitle2" component="h2" fontWeight="bold" sx={{ mb: 0.4 }}>
            {event.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.4 }}>
            <CalendarToday fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {recurrenceText}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.4 }}>
            <LocationOn fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {locationLabel}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckBoxRounded fontSize="inherit" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.78rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {participantCount} RSVP&lsquo;s
            </Typography>
            <AvatarGroup
              max={3}
              sx={{
                ml: 1,
                '& .MuiAvatar-root': { width: 26, height: 26, fontSize: '0.7rem' },
              }}
            >
              {visibleParticipants.map(participant => (
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
        </CardContent>
      </Card>
    </Link>
  );
}
