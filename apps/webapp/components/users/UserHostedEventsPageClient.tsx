'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { FiCalendar } from 'react-icons/fi';
import { GetUserByUsernameDocument } from '@/data/graphql/query/User/query';
import { useHostedEventsByUser } from '@/hooks/useHostedEventsByUser';
import { BUTTON_STYLES, ROUTES } from '@/lib/constants';
import { getDisplayName } from '@/lib/utils/general';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { ProfileEventGrid } from '@/components/users/ProfileEventGrid';
import ErrorPage from '@/components/errors/ErrorPage';

type UserHostedEventsPageClientProps = {
  username: string;
};

export default function UserHostedEventsPageClient({ username }: UserHostedEventsPageClientProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const {
    data: userData,
    error: userError,
    loading: userLoading,
  } = useQuery(GetUserByUsernameDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { username },
  });
  const user = userData?.readUserByUsername ?? null;
  const {
    error: hostedEventsError,
    hasMore,
    hostedEvents,
    loading: hostedEventsLoading,
    loadingMore,
    loadMore,
    totalCount,
  } = useHostedEventsByUser(user?.userId, token, { enabled: Boolean(user?.userId) });
  const isOwnProfile = session?.user?.username === username;
  const displayName = getDisplayName(user);

  if (isNotFoundGraphQLError(userError)) {
    return (
      <ErrorPage
        statusCode={404}
        title="Profile not found"
        message="This user account doesn’t exist or has been removed."
        ctaLabel="Browse users"
        ctaHref={ROUTES.USERS.ROOT}
      />
    );
  }

  if (userError && !user) {
    return (
      <Typography color="error" sx={{ mt: 6, textAlign: 'center' }}>
        We couldn&apos;t load this profile right now.
      </Typography>
    );
  }

  if (userLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  if (hostedEventsError) {
    return (
      <Typography color="error" sx={{ mt: 6, textAlign: 'center' }}>
        We couldn&apos;t load hosted events right now.
      </Typography>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 935, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={0.75} sx={{ mb: 3 }}>
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
            }}
          >
            Hosted events
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.95rem', maxWidth: 560 }}>
            {totalCount > 0
              ? `${displayName} has hosted ${totalCount} event${totalCount === 1 ? '' : 's'}.`
              : `${displayName} has not hosted any events yet.`}
          </Typography>
        </Stack>

        {hostedEventsLoading && hostedEvents.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : hostedEvents.length === 0 ? (
          <Box
            sx={{
              alignItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              minHeight: 320,
              justifyContent: 'center',
              px: 3,
              py: 6,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'action.hover',
                borderRadius: '50%',
                color: 'text.secondary',
                display: 'flex',
                fontSize: 44,
                height: 96,
                justifyContent: 'center',
                width: 96,
              }}
            >
              <FiCalendar />
            </Box>
            <Typography sx={{ color: 'text.primary', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              No events hosted yet
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
              Start hosting events and they&apos;ll appear here.
            </Typography>
            <Button
              color="secondary"
              component={Link}
              href={isOwnProfile ? ROUTES.ACCOUNT.EVENTS.CREATE : ROUTES.EVENTS.ROOT}
              sx={{ ...BUTTON_STYLES, mt: 1 }}
              variant="contained"
            >
              {isOwnProfile ? 'Create Your First Event' : 'Explore Events'}
            </Button>
          </Box>
        ) : (
          <ProfileEventGrid events={hostedEvents} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
        )}
      </Box>
    </Box>
  );
}
