import { redirect } from 'next/navigation';
import { Box, Container, Typography, Stack } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetEventCategoriesDocument, GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/eventMutation';
import { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { getAuthHeader } from '@/lib/utils/auth';
import { loadServerEventManagementAccess } from '@/lib/server/eventManagementAccess';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = buildPageMetadata({
  title: 'Edit Event',
  description: 'Update event details, schedule, categories, and organizer settings.',
  noIndex: true,
});

export default async function Page(props: Props) {
  const params = await props.params;

  const session = await auth();
  const currentUserId = session?.user?.userId;

  if (!currentUserId) {
    redirect('/auth/signin');
  }

  const { data: eventCategories } = await getClient().query({
    query: GetEventCategoriesDocument,
  });

  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
    context: { headers: getAuthHeader(session?.user?.token) },
  });

  const event = eventRetrieved.readEventBySlug as EventDetail;

  const username = session?.user?.username;

  // Check if event exists
  if (!event) {
    redirect(username ? ROUTES.USERS.USER(username) : ROUTES.HOME);
  }

  const canManageEvent = await loadServerEventManagementAccess({
    event,
    token: session?.user?.token,
    userId: currentUserId,
    userRole: session?.user?.userRole,
  });

  if (!canManageEvent) {
    redirect(username ? ROUTES.USERS.USER(username) : ROUTES.HOME);
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
        <Container maxWidth="md">
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <EventMutationForm categoryList={eventCategories.readEventCategories} event={event} />
      </Container>
    </Box>
  );
}
