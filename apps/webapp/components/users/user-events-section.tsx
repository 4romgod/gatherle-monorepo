import { Box, Typography, Grid, Chip, Stack, Paper, Button } from '@mui/material';
import EventBox from '@/components/events/event-box';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import { Event as EventIcon } from '@mui/icons-material';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface EventWithRole extends EventPreview {
  userRole?: 'Host' | 'CoHost' | 'Participant';
  participantStatus?: ParticipantStatus;
  quantity?: number;
}

interface Props {
  title: string;
  events: EventWithRole[];
  emptyMessage?: string;
}

const getRoleColor = (role?: string) => {
  switch (role) {
    case 'Host':
      return 'primary';
    case 'CoHost':
      return 'secondary';
    case 'Participant':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusColor = (status?: ParticipantStatus) => {
  switch (status) {
    case ParticipantStatus.Going:
      return 'success';
    case ParticipantStatus.Interested:
      return 'info';
    case ParticipantStatus.Waitlisted:
      return 'warning';
    case ParticipantStatus.CheckedIn:
      return 'success';
    case ParticipantStatus.Cancelled:
      return 'error';
    default:
      return 'default';
  }
};

export default function UserEventsSection({ title, events, emptyMessage }: Props) {
  if (events.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EventIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emptyMessage || 'No events to display.'}
            </Typography>
          </Box>
          <Button
            component={Link}
            href={ROUTES.EVENTS.ROOT}
            variant="outlined"
            size="small"
          >
            Explore Events
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Typography variant="h5" fontWeight={600} gutterBottom mb={3}>
        {title}
      </Typography>
      <Grid container spacing={3}>
        {events.map((event) => {
          return (
            <Grid size={{ xs: 12 }} key={`EventTileGrid.${event.eventId}`}>
              <Box component="div" position="relative">
                <EventBox event={event} />
                {(event.userRole || event.participantStatus) && (
                  <Box
                    position="absolute"
                    top={16}
                    right={16}
                    zIndex={10}
                  >
                    <Stack direction="row" spacing={1}>
                      {event.userRole && (
                        <Chip
                          label={event.userRole}
                          color={getRoleColor(event.userRole) as any}
                          size="small"
                        />
                      )}
                      {event.participantStatus && (
                        <Chip
                          label={event.participantStatus}
                          color={getStatusColor(event.participantStatus) as any}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {event.quantity && event.quantity > 1 && (
                        <Chip
                          label={`+${event.quantity - 1}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}