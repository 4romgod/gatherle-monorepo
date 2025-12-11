'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { IconButton, Typography } from '@mui/material';
import { Event } from '@/data/graphql/types/graphql';
import { Box } from '@mui/material';
import { CalendarIcon, CheckCircleIcon, TicketIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { ShareRounded, ThumbUpOffAltOutlined } from '@mui/icons-material';
import { RRule } from 'rrule';

export default function EventBox({ event }: { event: Event }) {
  const { title, recurrenceRule, rSVPList, media } = event;
  const recurrenceText = RRule.fromString(recurrenceRule).toText();
  const imageUrl = media?.featuredImageUrl || 'https://images.unsplash.com/photo-1525286116112-b59af11adad1?auto=format&fit=crop&w=1200&q=80';

  return (
    <Card
      sx={{
        p: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '185px 1fr' },
        gap: 1.25,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 18px 48px rgba(0,0,0,0.08)',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 120, sm: '100%' },
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
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ alignSelf: 'center', width: '100%' }}>
          <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            Experience
          </Typography>
          <Typography variant="h6" color="text.primary" sx={{ mb: 0.75 }}>
            {title}
          </Typography>

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <CalendarIcon height={20} width={20} />
            <Typography variant='subtitle2' paddingLeft={1}>{recurrenceText}</Typography>
          </Box>

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <CheckCircleIcon height={20} width={20} />
            <Typography variant='subtitle2' paddingLeft={1}>{rSVPList.length ?? 0} RSVP&lsquo;s</Typography>
          </Box>

          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <TicketIcon height={20} width={20} />
            <Typography variant='subtitle2' paddingLeft={1}>Free</Typography>
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
  )
};
