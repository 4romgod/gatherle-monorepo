'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { Avatar, AvatarGroup, IconButton, Tooltip, Typography, Chip, Stack } from '@mui/material';
import { EventParticipantPreview, EventPreview } from '@/data/graphql/query/Event/types';
import { Box } from '@mui/material';
import { CalendarIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';
import { ShareRounded, BookmarkBorderOutlined, PeopleOutline } from '@mui/icons-material';
import { RRule } from 'rrule';

export default function EventBox({ event }: { event: EventPreview }) {
  const { title, slug, recurrenceRule, participants, media, heroImage, location, status } = event;
  const recurrenceText = RRule.fromString(recurrenceRule).toText();
  // TODO This placeholder image is just for development purposes
  const imageUrl =
    heroImage ||
    media?.featuredImageUrl ||
    'https://images.unsplash.com/photo-1525286116112-b59af11adad1?auto=format&fit=crop&w=1200&q=80';
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
    <Card
      sx={{
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
        gap: 0,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            transform: 'translateY(-2px)',
            '& .event-image': {
              transform: 'scale(1.05)',
            },
            '& .event-overlay': {
              backgroundColor: 'rgba(0,0,0,0.35)',
            },
          },
        }}
      >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 160, sm: '100%' },
          width: '100%',
          minHeight: 200,
          overflow: 'hidden',
        }}
      >
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
        <Box
          className="event-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
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
              backgroundColor: 'rgba(255,255,255,0.9)',
            }}
          />
        )}
      </Box>
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column', p: 2.5, gap: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {participantCount > 0 && (
              <Chip
                icon={<PeopleOutline sx={{ fontSize: 16 }} />}
                label={`${participantCount} going`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Stack>

          <Typography 
            variant="h6" 
            color="text.primary" 
            sx={{ 
              fontWeight: 700,
              lineHeight: 1.3,
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </Typography>

          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarIcon height={18} width={18} style={{ color: 'inherit', opacity: 0.7 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {recurrenceText}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MapPinIcon height={18} width={18} style={{ color: 'inherit', opacity: 0.7 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {locationText}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TicketIcon height={18} width={18} style={{ color: 'inherit', opacity: 0.7 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Free
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1 }}>
          {participantCount > 0 && (
            <AvatarGroup
              max={3}
              sx={{
                '& .MuiAvatar-root': { 
                  width: 32, 
                  height: 32, 
                  fontSize: '0.875rem',
                  border: '2px solid',
                  borderColor: 'background.paper',
                },
              }}
            >
              {visibleParticipants.map(participant => (
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

          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label={`Bookmark ${title}`}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  backgroundColor: 'primary.lighter',
                },
              }}
            >
              <BookmarkBorderOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label={`Share ${title}`}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'secondary.main',
                  color: 'secondary.main',
                  backgroundColor: 'secondary.lighter',
                },
              }}
            >
              <ShareRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Card>
  );
}
