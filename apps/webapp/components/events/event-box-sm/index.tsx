'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { CardContent, Typography } from '@mui/material';
import { EventType } from '@/data/graphql/types/graphql';
import { Box } from '@mui/material';
import { CalendarToday, LocationOn, CheckBoxRounded } from '@mui/icons-material';
import { RRule } from 'rrule';

export default function EventBoxSm({ event }: { event: EventType }) {
  const { title, recurrenceRule, rSVPList, location } = event;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 20px rgba(0,0,0,0.1)'
        },
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden' }}>
        <CardMedia
          component="img"
          image={'https://picsum.photos/300'} // TODO handle undefined image (use a default image)
          alt={event.title}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        {/* <Chip 
        label={event.category}
        size="small"
        sx={{ 
          position: 'absolute', 
          top: 12, 
          left: 12,
          backgroundColor: 'rgba(255,255,255,0.85)',
          fontWeight: 600
        }}
      /> */}
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography gutterBottom variant="h6" component="h2" fontWeight="bold" sx={{ mb: 1 }}>
          {event.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CalendarToday fontSize="small" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }} />
          <Typography variant="body2" color="text.secondary">
            {RRule.fromString(recurrenceRule).toText()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationOn fontSize="small" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }} />
          <Typography variant="body2" color="text.secondary">
            {location.address?.country}, {location.address?.city}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckBoxRounded fontSize="small" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }} />
          <Typography variant="body2" color="text.secondary">
            {rSVPList.length ?? 0} RSVP&lsquo;s
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}