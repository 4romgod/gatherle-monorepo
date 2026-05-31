import { Metadata } from 'next';
import { Box, Container, Typography, Stack } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetEventCategoriesDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/eventMutation';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Event',
  description: 'Publish a new event with categories, timing, and venue details.',
  noIndex: true,
});

export default async function CreateEvent() {
  const { data: eventCategories } = await getClient().query({
    query: GetEventCategoriesDocument,
  });

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        py: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
          py: { xs: 3, md: 4 },
          mb: 4,
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                <AddCircleOutline sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} />
                Create New Event
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="md"
        sx={{
          display: { xs: 'block', md: 'none' },
          px: { xs: 2, sm: 3 },
          pb: 2,
        }}
      >
        <Box sx={{ pb: 1 }}>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
            Create event
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="body2">
            Share the essentials, choose the right community context, and publish when you&apos;re ready.
          </Typography>
        </Box>
      </Container>

      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0, md: 4 } }}>
        <EventMutationForm categoryList={eventCategories.readEventCategories} />
      </Container>
    </Box>
  );
}
