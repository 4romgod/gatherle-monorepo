'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { Avatar, AvatarGroup, IconButton, Tooltip, Typography } from '@mui/material';
import { EventParticipantPreview, EventPreview } from '@/data/graphql/query/Event/types';
import { Box } from '@mui/material';
import { CalendarIcon, CheckCircleIcon, TicketIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { ShareRounded, ThumbUpOffAltOutlined } from '@mui/icons-material';
import { RRule } from 'rrule';

export default function EventBox({ event }: { event: EventPreview }) {
  const { title, recurrenceRule, participants, media, heroImage } = event;
  const recurrenceText = RRule.fromString(recurrenceRule).toText();
  const imageUrl =
    heroImage ||
    media?.featuredImageUrl ||
    'https://images.unsplash.com/photo-1525286116112-b59af11adad1?auto=format&fit=crop&w=1200&q=80';
  const participantCount = participants?.length ?? 0;
  const participantList = (participants ?? []) as EventParticipantPreview[];
  const visibleParticipants = participantList.slice(0, 4);

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

  return (
    <Card
      sx={{
        p: { xs: 0.75, sm: 1 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' },
        gap: 1,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        position: 'relative',
        minHeight: 170,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 120, sm: 170 },
          width: { xs: '100%', sm: 170 },
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        <CardMedia
          component="img"
          image={imageUrl}
          alt={title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        />
      </Box>
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ alignSelf: 'stretch', width: '100%' }}>
          <Typography
            variant="overline"
            color="secondary.main"
            sx={{ fontWeight: 700, letterSpacing: 0.8, fontSize: '0.65rem' }}
          >
            Experience
          </Typography>
          <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5, fontWeight: 700 }}>
            {title}
          </Typography>

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <CalendarIcon height={20} width={20} />
            <Typography variant="subtitle2" paddingLeft={1}>
              {recurrenceText}
            </Typography>
          </Box>

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1, alignItems: 'center' }}>
            <CheckCircleIcon height={20} width={20} />
            <Typography variant="subtitle2" paddingLeft={1}>
              {participantCount} RSVP&lsquo;s
            </Typography>
            <AvatarGroup
              max={4}
              sx={{
                ml: 1,
                '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' },
              }}
            >
              {/* TODO should link to user profiles */}
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

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <TicketIcon height={20} width={20} />
            <Typography variant="subtitle2" paddingLeft={1}>
              Free
            </Typography>
          </Box>
        </Box>

        <Box component="div" sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
          <IconButton
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <ShareRounded />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <ThumbUpOffAltOutlined height={20} width={20} />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <EllipsisHorizontalIcon height={30} width={30} />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
}
