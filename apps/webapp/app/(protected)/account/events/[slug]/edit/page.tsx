import React from 'react';
import { Box, Container, Paper, Typography, Button, Stack } from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument, GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/event-mutation';
import { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;

  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug as EventDetail;

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
                  component={Link}
                  href={ROUTES.ACCOUNT.EVENTS.VIEW(params.slug)}
                  startIcon={<ArrowBack />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back
                </Button>
              </Stack>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                EVENT MANAGEMENT
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                <Edit sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} />
                Edit Event
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Form Container */}
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <EventMutationForm categoryList={eventCategories.readEventCategories} event={event} />
        </Paper>
      </Container>
    </Box>
  );
}
