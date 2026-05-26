import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { FollowTargetType } from '@data/graphql/types/graphql';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList, UserConnectionsMode } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { ConnectionRow } from '@/components/users/ConnectionRow';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { usePaginatedFollowers, usePaginatedUserFollowing } from '@/hooks/follow/usePaginatedUserConnections';

type UserConnectionsRoute = RouteProp<RootStackParamList, 'UserConnections'>;

function getUserDisplayName(user: {
  family_name?: string | null;
  given_name?: string | null;
  username?: string | null;
}) {
  const name = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  return name || user.username || 'Member';
}

function getEmptyMessage(mode: UserConnectionsMode) {
  return mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.';
}

export function UserConnectionsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<UserConnectionsRoute>();
  const { authToken } = useAppShell();
  const { theme } = useAppTheme();
  const { displayName, mode, totalCount: initialTotalCount = 0, userId, username } = route.params;
  const followersQuery = usePaginatedFollowers(userId, authToken, {
    enabled: mode === 'followers',
    totalCount: mode === 'followers' ? initialTotalCount : undefined,
  });
  const followingQuery = usePaginatedUserFollowing(userId, authToken, {
    enabled: mode === 'following',
    totalCount: mode === 'following' ? initialTotalCount : undefined,
  });
  const queryState = mode === 'followers' ? followersQuery : followingQuery;
  const items = mode === 'followers' ? followersQuery.followers : followingQuery.following;
  const resolvedName = displayName ?? username ?? 'This member';
  const isPrivateList = initialTotalCount > 0 && items.length === 0 && !queryState.loading && !queryState.error;
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await queryState.refetch();
    }, [queryState.refetch]),
  );
  const infiniteScroll = useInfiniteScroll({
    enabled: queryState.hasMore,
    loading: queryState.loading || queryState.loadingMore,
    onEndReached: queryState.loadMore,
    resetKey: `${mode}:${userId}:${items.length}`,
  });

  if (queryState.loading && items.length === 0) {
    return (
      <PageContainer>
        <PageHeading
          subtitle={`Loading ${mode} for ${resolvedName}.`}
          title={mode === 'followers' ? 'Followers' : 'Following'}
        />
        <View style={styles.list}>
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
        </View>
      </PageContainer>
    );
  }

  if (queryState.error && items.length === 0) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <PageHeading
          subtitle={`We couldn’t load ${mode} for ${resolvedName}.`}
          title={mode === 'followers' ? 'Followers' : 'Following'}
        />
        <StateNotice
          actionLabel="Retry"
          message="Try reloading this list."
          onPressAction={() => void queryState.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      onContentSizeChange={infiniteScroll.onContentSizeChange}
      onRefresh={onRefresh}
      onScroll={infiniteScroll.onScroll}
      refreshing={refreshing}
      scrollEventThrottle={infiniteScroll.scrollEventThrottle}
    >
      <PageHeading
        subtitle={
          isPrivateList
            ? `${resolvedName}'s ${mode} list isn’t available right now.`
            : mode === 'followers'
              ? `${resolvedName} has ${initialTotalCount} follower${initialTotalCount === 1 ? '' : 's'}.`
              : `${resolvedName} is following ${initialTotalCount} account${initialTotalCount === 1 ? '' : 's'}.`
        }
        title={mode === 'followers' ? 'Followers' : 'Following'}
      />

      {items.length === 0 ? (
        <StateNotice message={isPrivateList ? `${resolvedName}'s ${mode} list is private.` : getEmptyMessage(mode)} />
      ) : (
        <View style={styles.list}>
          {mode === 'followers'
            ? followersQuery.followers.map((follow) => {
                const follower = follow.follower;
                if (!follower) {
                  return null;
                }

                const display = getUserDisplayName(follower);
                return (
                  <ConnectionRow
                    description={follower.bio || 'Gatherle community member'}
                    imageUrl={follower.profile_picture}
                    key={follow.followId}
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        avatarUrl: follower.profile_picture,
                        displayName: display,
                        userId: follower.userId,
                        username: follower.username,
                      })
                    }
                    subtitle={`@${follower.username}`}
                    title={display}
                  />
                );
              })
            : followingQuery.following.map((follow) => {
                if (follow.targetType === FollowTargetType.Organization && follow.targetOrganization) {
                  return (
                    <ConnectionRow
                      avatarShape="rounded"
                      description="Organization on Gatherle"
                      imageUrl={follow.targetOrganization.logo}
                      key={follow.followId}
                      onPress={() =>
                        navigation.navigate('OrganizationDetails', {
                          orgId: follow.targetOrganization!.orgId,
                          orgName: follow.targetOrganization!.name,
                        })
                      }
                      subtitle={follow.targetOrganization.slug}
                      title={follow.targetOrganization.name}
                    />
                  );
                }

                if (!follow.targetUser) {
                  return null;
                }

                const display = getUserDisplayName(follow.targetUser);
                return (
                  <ConnectionRow
                    description={follow.targetUser.bio || 'Gatherle community member'}
                    imageUrl={follow.targetUser.profile_picture}
                    key={follow.followId}
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        avatarUrl: follow.targetUser!.profile_picture,
                        displayName: display,
                        userId: follow.targetUser!.userId,
                        username: follow.targetUser!.username,
                      })
                    }
                    subtitle={`@${follow.targetUser.username}`}
                    title={display}
                  />
                );
              })}

          {queryState.loadingMore ? (
            <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>Loading more…</Text>
          ) : null}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  loadingMoreText: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
    textAlign: 'center',
  },
});
