'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { GetUserByUsernameDocument } from '@/data/graphql/query/User/query';
import { ROUTES } from '@/lib/constants';
import { getDisplayName } from '@/lib/utils/general';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePaginatedFollowers, usePaginatedUserFollowing } from '@/hooks/useProfileConnections';
import { ProfileConnectionRow } from '@/components/users/ProfileConnectionRow';
import ErrorPage from '@/components/errors/ErrorPage';

type UserConnectionsPageClientProps = {
  mode: 'followers' | 'following';
  username: string;
};

function getUserSubtitle(handle?: string | null) {
  return handle ? `@${handle}` : 'Member';
}

export default function UserConnectionsPageClient({ mode, username }: UserConnectionsPageClientProps) {
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
  const totalCount = mode === 'followers' ? (user?.followersCount ?? 0) : (user?.followingCount ?? 0);
  const followersQuery = usePaginatedFollowers(user?.userId, token, {
    enabled: mode === 'followers' && Boolean(user?.userId),
    totalCount,
  });
  const followingQuery = usePaginatedUserFollowing(user?.userId, token, {
    enabled: mode === 'following' && Boolean(user?.userId),
    totalCount,
  });
  const queryState = mode === 'followers' ? followersQuery : followingQuery;
  const items = mode === 'followers' ? followersQuery.followers : followingQuery.following;
  const displayName = getDisplayName(user);
  const isPrivateList = totalCount > 0 && items.length === 0 && !queryState.loading && !queryState.error;
  const loadMoreTriggerRef = useInfiniteScroll({
    enabled: queryState.hasMore,
    loading: queryState.loading || queryState.loadingMore,
    onEndReached: queryState.loadMore,
  });

  const renderedItems = useMemo(() => {
    if (mode === 'followers') {
      return followersQuery.followers
        .map((follow) => {
          const follower = follow.follower;
          if (!follower) {
            return null;
          }

          return (
            <ProfileConnectionRow
              avatarSrc={follower.profile_picture}
              description={follower.bio || 'Gatherle community member'}
              href={ROUTES.USERS.USER(follower.username)}
              key={follow.followId}
              subtitle={getUserSubtitle(follower.username)}
              title={getDisplayName(follower)}
            />
          );
        })
        .filter(Boolean);
    }

    return followingQuery.following
      .map((follow) => {
        if (follow.targetUser) {
          return (
            <ProfileConnectionRow
              avatarSrc={follow.targetUser.profile_picture}
              description={follow.targetUser.bio || 'Gatherle community member'}
              href={ROUTES.USERS.USER(follow.targetUser.username)}
              key={follow.followId}
              subtitle={getUserSubtitle(follow.targetUser.username)}
              title={getDisplayName(follow.targetUser)}
            />
          );
        }

        if (follow.targetOrganization) {
          return (
            <ProfileConnectionRow
              avatarSrc={follow.targetOrganization.logo}
              avatarVariant="rounded"
              description="Organization on Gatherle"
              href={ROUTES.ORGANIZATIONS.ORG(follow.targetOrganization.slug)}
              key={follow.followId}
              subtitle={follow.targetOrganization.slug}
              title={follow.targetOrganization.name}
            />
          );
        }

        return null;
      })
      .filter(Boolean);
  }, [followersQuery.followers, followingQuery.following, mode]);

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

  if (queryState.error) {
    return (
      <Typography color="error" sx={{ mt: 6, textAlign: 'center' }}>
        We couldn&apos;t load this list right now.
      </Typography>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
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
            {mode === 'followers' ? 'Followers' : 'Following'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.95rem', maxWidth: 560 }}>
            {isPrivateList
              ? `${displayName}'s ${mode} list isn’t available right now.`
              : mode === 'followers'
                ? `${displayName} has ${totalCount} follower${totalCount === 1 ? '' : 's'}.`
                : `${displayName} is following ${totalCount} account${totalCount === 1 ? '' : 's'}.`}
          </Typography>
        </Stack>

        {queryState.loading && items.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              alignItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'center',
              minHeight: 260,
              px: 3,
              py: 6,
              textAlign: 'center',
            }}
          >
            <Typography color="text.secondary">
              {isPrivateList
                ? `${displayName}'s ${mode} list is private.`
                : mode === 'followers'
                  ? 'No followers yet.'
                  : 'Not following anyone yet.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.1}>
            {renderedItems}
            {queryState.hasMore ? (
              <Box
                ref={loadMoreTriggerRef}
                sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: 26, pt: 1 }}
              >
                {queryState.loadingMore ? <CircularProgress size={20} /> : null}
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
