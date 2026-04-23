import { Box, Button, Container, Typography } from '@mui/material';
import { Add, Event as EventIcon } from '@mui/icons-material';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/constants';
import UserEventsList from '@/components/account/UserEventsList';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Events',
  description: 'View and manage events you are hosting or organizing.',
  noIndex: true,
});

export default async function AccountEventsPage() {
  const session = await auth();
  if (!session?.user?.token || !session.user.userId) {
    redirect(ROUTES.AUTH.LOGIN);
  }

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
              Events you&apos;re hosting
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Manage the events you organise. Create new events, edit details, and track attendance.
            </Typography>
            <Button
              variant="contained"
              size="large"
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

      {/* Events List */}
      <Container sx={{ py: 6 }}>
        <UserEventsList userId={session.user.userId} />
      </Container>
    </Box>
  );
}
