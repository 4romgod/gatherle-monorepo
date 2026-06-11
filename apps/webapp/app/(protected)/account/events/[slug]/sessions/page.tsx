import { redirect } from 'next/navigation';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { CalendarMonth, Edit } from '@mui/icons-material';
import { auth } from '@/auth';
import OrganizerEventSessionsManager from '@/components/account/OrganizerEventSessionsManager';
import { getClient } from '@/data/graphql';
import { GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import { ROUTES, SECTION_TITLE_STYLES } from '@/lib/constants';
import type { EventDetail } from '@/data/graphql/query/Event/types';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { getAuthHeader } from '@/lib/utils/auth';
import { loadServerEventManagementAccess } from '@/lib/server/eventManagementAccess';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = buildPageMetadata({
  title: 'Manage Sessions',
  description: 'Inspect, reschedule, cancel, and split recurring event sessions you manage.',
  noIndex: true,
});

export default async function AccountEventSessionsPage(props: Props) {
  const params = await props.params;
  const session = await auth();
  const currentUserId = session?.user?.userId;

  if (!currentUserId) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { data } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
    context: { headers: getAuthHeader(session?.user?.token) },
  });

  const event = data.readEventBySlug as EventDetail | null;
  const username = session?.user?.username;

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
    <Box component="main" sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 3.5, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h3" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.6rem', md: '2.35rem' } }}>
                  Sessions
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 760 }}>
                Manage the concrete sessions for &quot;{event.title}&quot;. Reschedule one occurrence, cancel a single
                session, split the future schedule, and inspect attendee state without leaving your event management
                tools.
              </Typography>
            </Stack>

            <Button
              href={ROUTES.ACCOUNT.EVENTS.EDIT_EVENT(event.slug)}
              startIcon={<Edit />}
              variant="outlined"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Edit series
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <OrganizerEventSessionsManager event={event} token={session?.user?.token} />
      </Container>
    </Box>
  );
}
