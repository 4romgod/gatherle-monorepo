import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApolloError, useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import type { MobileDirectoryUser } from '@data/graphql/query/User/types';
import { FollowTargetType, QueryOptionsInput } from '@data/graphql/types/graphql';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { CommunityMemberRow } from '@/components/community/CommunityMemberRow';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useFollowTarget } from '@/hooks/follow/useFollowTarget';
import { getApolloAuthContext } from '@/lib/auth';
import { getApolloErrorCode } from '@/lib/auth/apolloErrors';

const communityOptions: QueryOptionsInput = {
  pagination: {
    limit: 40,
  },
};

export function CommunityScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated, userId: viewerUserId } = useAppShell();
  const { data, error, loading, refetch } = useQuery(GetUsersDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    variables: {
      options: communityOptions,
    },
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      if (!isAuthenticated || !authToken) {
        return;
      }

      await refetch();
    }, [authToken, isAuthenticated, refetch]),
  );

  const users = data?.readUsers ?? [];
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [
        user.username,
        user.bio,
        user.given_name,
        user.family_name,
        user.location?.city,
        user.location?.state,
        user.location?.country,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, users]);
  const isUnauthorizedError = error ? getApolloErrorCode(error as ApolloError) === 'UNAUTHENTICATED' : false;

  if (!isAuthenticated || isUnauthorizedError) {
    return (
      <PageContainer>
        <AuthPromptCard
          description={
            isUnauthorizedError
              ? 'Your session has expired. Sign in again to view community members.'
              : 'Sign in to discover members, follow people, and start conversations.'
          }
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title={isUnauthorizedError ? 'Session expired' : 'Community requires sign-in'}
        />
      </PageContainer>
    );
  }

  if (!authToken) {
    return (
      <PageContainer>
        <StateNotice
          actionLabel="Login"
          message="Your session is not available. Log in again to view community members."
          onPressAction={() => navigation.navigate('Login')}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <SearchField onChangeText={setQuery} placeholder="Search people" value={query} />

      {loading && filteredUsers.length === 0 ? (
        <View style={styles.list}>
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
          <DirectoryRowSkeleton />
        </View>
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load community members."
          onPressAction={() => void refetch()}
        />
      ) : filteredUsers.length > 0 ? (
        <View style={styles.list}>
          {filteredUsers.map((user) => (
            <CommunityMemberListItem
              authToken={authToken}
              key={user.userId}
              navigation={navigation}
              user={user}
              viewerUserId={viewerUserId}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="No community members matched your search." />
      )}
    </PageContainer>
  );
}

function CommunityMemberListItem({
  authToken,
  navigation,
  user,
  viewerUserId,
}: {
  authToken: string | null;
  navigation: DetailNavigation;
  user: MobileDirectoryUser;
  viewerUserId?: string | null;
}) {
  const { follow, isFollowing, isPending } = useFollowTarget({
    authToken,
    targetId: user.userId,
    targetType: FollowTargetType.User,
  });
  const isOwnProfile = viewerUserId === user.userId;
  const displayName = `${user.given_name ?? ''} ${user.family_name ?? ''}`.trim() || user.username;

  const navigateToProfile = () => {
    if (isOwnProfile) {
      navigation.navigate('MainTabs', { screen: 'Account' });
      return;
    }

    navigation.navigate('UserProfile', {
      avatarUrl: user.profile_picture,
      displayName,
      userId: user.userId,
      username: user.username,
    });
  };

  const handlePrimaryAction = () => {
    if (isFollowing) {
      navigation.navigate('MessageThread', {
        avatarUrl: user.profile_picture,
        displayName,
        username: user.username,
        withUserId: user.userId,
      });
      return;
    }

    if (isPending) {
      navigateToProfile();
      return;
    }

    if (!authToken) {
      navigation.navigate('Login', { redirectTab: 'Messages' });
      return;
    }

    void follow();
  };

  return (
    <CommunityMemberRow
      actionTone={isFollowing || isPending ? 'neutral' : 'primary'}
      onPress={navigateToProfile}
      onPressPrimaryAction={isOwnProfile ? undefined : handlePrimaryAction}
      primaryActionLabel={isOwnProfile ? undefined : isFollowing ? 'Message' : isPending ? 'Requested' : 'Follow'}
      user={user}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
});
