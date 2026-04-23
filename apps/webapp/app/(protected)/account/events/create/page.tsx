import { Metadata } from 'next';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { ArrowBack, AddCircleOutline } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/eventMutation';
import { ROUTES } from '@/lib/constants';
import { buildPageMetadata } from '@/lib/metadata';
import { auth } from '@/auth';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Event',
  description: 'Publish a new event with categories, timing, and venue details.',
  noIndex: true,
});

export default async function CreateEvent() {
  const session = await auth();
  const username = session?.user?.username;
  const profileUrl = username ? ROUTES.USERS.USER(username) : ROUTES.ACCOUNT.ROOT;

  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        py: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 3, md: 4 },
          mb: 4,
        }}
      >
        <Container>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Button
                  href={profileUrl}
                  startIcon={<ArrowBack />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back to Profile
                </Button>
              </Stack>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                EVENT MANAGEMENT
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                <AddCircleOutline sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} />
                Create New Event
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Form Container */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <EventMutationForm categoryList={eventCategories.readEventCategories} />
      </Container>
    </Box>
  );
}
