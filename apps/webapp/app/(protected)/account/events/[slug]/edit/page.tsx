import React from 'react';
import { redirect } from 'next/navigation';
import { Box, Container, Typography, Button, Stack, Card } from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument, GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/eventMutation';
import { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES, BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import LinkComponent from '@/components/navigation/LinkComponent';
import { auth } from '@/auth';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;

  const session = await auth();
  const currentUserId = session?.user?.userId;

  if (!currentUserId) {
    redirect('/auth/signin');
  }

  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug as EventDetail;

  // Check if event exists
  if (!event) {
    redirect(ROUTES.ACCOUNT.EVENTS.ROOT);
  }

  const isOrganizer = event.organizers.some((organizer) => organizer.user.userId === currentUserId);

  if (!isOrganizer) {
    redirect(ROUTES.ACCOUNT.EVENTS.ROOT);
  }

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={LinkComponent}
            href={ROUTES.ACCOUNT.EVENTS.EVENT(params.slug)}
            startIcon={<ArrowBack />}
            sx={{ ...BUTTON_STYLES, mb: 2 }}
          >
            Back to Event
          </Button>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h3" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
              Edit Event
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            Update the details of "{event?.title}"
          </Typography>
        </Container>
      </Box>

      {/* Form Container */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: { xs: 3, md: 4 },
          }}
        >
          <EventMutationForm categoryList={eventCategories.readEventCategories} event={event} />
        </Card>
      </Container>
    </Box>
  );
}
