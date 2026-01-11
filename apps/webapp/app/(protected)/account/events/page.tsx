import EventBox from '@/components/events/event-box';
import { FilterOperatorInput, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
import { Add, Event as EventIcon } from '@mui/icons-material';

export default async function EventsPage() {
  const session = await auth();
  if (!session) {
    return;
  }

  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
    variables: {
      options: {
        filters: [
          {
            field: 'organizers.user.userId',
            operator: FilterOperatorInput.Eq,
            value: session.user.userId,
          },
        ],
      },
    },
  });

  const eventList = events.readEvents ?? [];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container>
          <Box sx={{ maxWidth: '800px' }}>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <EventIcon sx={{ fontSize: 20 }} />
              MY EVENTS
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' },
                lineHeight: 1.2,
              }}
            >
              Your hosted events
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}
            >
              Manage all events you're hosting or organizing. Create new events, edit details, and track RSVPs.
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={Link}
              href={ROUTES.ACCOUNT.EVENTS.CREATE}
              startIcon={<Add />}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                py: 1.5,
                px: 4,
                borderRadius: 2,
                fontSize: '1rem',
              }}
            >
              Create Event
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Events Grid */}
      <Container sx={{ py: 6 }}>
        {eventList.length > 0 ? (
          <Grid container spacing={3}>
            {eventList.map(event => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={event.eventId}>
                <Link
                  href={ROUTES.ACCOUNT.EVENTS.EVENT(event.slug)}
                  style={{ textDecoration: 'none' }}
                >
                  <EventBox event={event} />
                </Link>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
            }}
          >
            <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No events yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first event to start bringing people together
            </Typography>
            <Button
              variant="contained"
              component={Link}
              href={ROUTES.ACCOUNT.EVENTS.CREATE}
              startIcon={<Add />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
              }}
            >
              Create Event
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
