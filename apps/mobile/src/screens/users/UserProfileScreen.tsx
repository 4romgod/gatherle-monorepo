import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApolloError, useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { FollowTargetType, SortOrderInput } from '@data/graphql/types/graphql';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { GetUserProfileByIdDocument } from '@data/graphql/query/User/query';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { ProfileBadge } from '@/components/account/ProfileBadge';
import { ProfileActionButton } from '@/components/account/ProfileActionButton';
import { ProfileStat } from '@/components/account/ProfileStat';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { PageContainer } from '@/components/core/PageContainer';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { DetailSection } from '@/components/details/DetailSection';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { AccountScreenSkeleton } from '@/components/skeleton/AccountScreenSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { usePublicEvents } from '@/hooks/events/usePublicEvents';
import { useUserEventOccurrences } from '@/hooks/events/useUserEventOccurrences';
import { useFollowTarget } from '@/hooks/follow/useFollowTarget';
import { getApolloAuthContext } from '@/lib/auth';
import { buildProfileBadges } from '@/lib/account/profileBadges';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type UserProfileRoute = RouteProp<RootStackParamList, 'UserProfile'>;
type PublicProfileTab = 'going' | 'past' | 'hosting';

function flattenApolloErrorMessages(error: ApolloError | undefined): string[] {
  if (!error) {
    return [];
  }

  const graphQlMessages = error.graphQLErrors.map((graphQlError) => graphQlError.message);
  const networkResultErrors =
    (error.networkError &&
    'result' in error.networkError &&
    error.networkError.result &&
    typeof error.networkError.result === 'object' &&
    Array.isArray((error.networkError.result as { errors?: Array<{ message?: string }> }).errors)
      ? ((error.networkError.result as { errors?: Array<{ message?: string }> }).errors ?? [])
          .map((resultError) => resultError.message)
          .filter((message): message is string => Boolean(message))
      : []) ?? [];

  return [error.message, ...graphQlMessages, ...networkResultErrors];
}

function isUnsupportedUserEventOccurrencesError(error: ApolloError | undefined): boolean {
  return flattenApolloErrorMessages(error).some((message) => message.includes('readUserEventOccurrences'));
}

export function UserProfileScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<UserProfileRoute>();
  const { authToken, isAuthenticated, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const { userId, username: routeUsername, displayName: routeDisplayName, avatarUrl } = route.params;
  const isOwnProfile = viewerUserId === userId;
  const { data, error, loading, refetch } = useQuery(GetUserProfileByIdDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      followersTargetId: userId,
      followersTargetType: FollowTargetType.User,
      userId,
    },
    ...getApolloAuthContext(authToken),
  });
  const profile = data?.readUserById ?? null;
  const followers = data?.readFollowers ?? [];
  const { follow, isFollowing, isPending, unfollow } = useFollowTarget({
    authToken,
    targetId: userId,
    targetType: FollowTargetType.User,
  });
  const {
    error: eventsError,
    loading: eventsLoading,
    occurrences,
    refetch: refetchEvents,
  } = usePublicEvents(
    {
      filters: [{ field: 'organizers.user.userId', value: userId }],
      pagination: { limit: 18 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    },
    authToken,
  );
  const {
    error: participantEventsError,
    loading: participantEventsLoading,
    occurrences: participantOccurrences,
    refetch: refetchParticipantOccurrences,
  } = useUserEventOccurrences(userId, authToken);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchEvents(), refetchParticipantOccurrences()]);
    }, [refetch, refetchEvents, refetchParticipantOccurrences]),
  );

  const profileName = getDisplayName(profile) || routeDisplayName || routeUsername || 'Gatherle member';
  const badges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);
  const interests = useMemo(() => profile?.interests?.filter(Boolean) ?? [], [profile?.interests]);
  const followerPreview = followers.slice(0, 3);
  const hostedEventsCount = occurrences.length;
  const participantActivityUnsupported = isUnsupportedUserEventOccurrencesError(participantEventsError);
  const shouldShowParticipantTabs = !participantActivityUnsupported;
  const upcomingRsvpEvents = useMemo(
    () =>
      participantOccurrences
        .filter((occurrence) => {
          const endAt = occurrence.endAt
            ? new Date(occurrence.endAt).getTime()
            : new Date(occurrence.startAt).getTime();
          return endAt >= Date.now();
        })
        .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
    [participantOccurrences],
  );
  const pastEvents = useMemo(
    () =>
      participantOccurrences
        .filter((occurrence) => {
          const endAt = occurrence.endAt
            ? new Date(occurrence.endAt).getTime()
            : new Date(occurrence.startAt).getTime();
          return endAt < Date.now();
        })
        .sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime()),
    [participantOccurrences],
  );
  const profileTabs = useMemo<Record<PublicProfileTab, MobileEventOccurrence[]>>(
    () => ({
      going: upcomingRsvpEvents,
      past: pastEvents,
      hosting: occurrences,
    }),
    [occurrences, pastEvents, upcomingRsvpEvents],
  );
  const profileRoutes = useMemo(
    () =>
      (
        [
          ...(shouldShowParticipantTabs
            ? ([
                { icon: 'check-square', key: 'going', label: 'RSVPs' },
                { icon: 'clock', key: 'past', label: 'Past' },
              ] as const)
            : []),
          { icon: 'calendar', key: 'hosting', label: 'Hosting' },
        ] as const
      ).map((route) => ({
        ...route,
        render: () => (
          <PublicProfileTabPane
            emptyMessage={
              route.key === 'going'
                ? 'No upcoming RSVPs are visible for this member right now.'
                : route.key === 'past'
                  ? 'No past event activity is visible for this member right now.'
                  : 'This member has no visible hosted events right now.'
            }
            loading={route.key === 'hosting' ? eventsLoading : participantEventsLoading}
            occurrences={profileTabs[route.key]}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
          />
        ),
      })),
    [eventsLoading, navigation, participantEventsLoading, profileTabs, shouldShowParticipantTabs],
  );
  const shouldShowEventActivityError =
    Boolean(eventsError) || (Boolean(participantEventsError) && !participantActivityUnsupported);

  const handleFollowPress = () => {
    if (isOwnProfile) {
      navigation.navigate('Profile');
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    if (isFollowing || isPending) {
      void unfollow();
      return;
    }

    void follow();
  };

  const handleMessagePress = () => {
    if (isOwnProfile) {
      navigation.navigate('Settings');
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login', { redirectTab: 'Messages' });
      return;
    }

    navigation.navigate('MessageThread', {
      avatarUrl: profile?.profile_picture ?? avatarUrl,
      displayName: profileName,
      username: profile?.username ?? routeUsername,
      withUserId: userId,
    });
  };

  if (loading && !profile) {
    return (
      <PageContainer>
        <AccountScreenSkeleton />
      </PageContainer>
    );
  }

  if ((error && !profile) || !profile) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load this profile."
          onPressAction={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.profileHeaderSection}>
        <View style={styles.profileTopRow}>
          <ProfileAvatar imageUrl={profile.profile_picture ?? avatarUrl} label={profileName} size={88} />

          <View style={styles.profileTopRail}>
            <View style={styles.profileIdentityRow}>
              <Text numberOfLines={1} style={[styles.profileTopHandle, { color: theme.colors.textPrimary }]}>
                @{profile.username ?? routeUsername ?? 'member'}
              </Text>

              {badges.length > 0 ? (
                <View style={styles.profileBadgesRow}>
                  {badges.map((badge) => (
                    <ProfileBadge badge={badge} key={badge.label} />
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.profileStatsRow}>
              <ProfileStat label="Events" value={String(hostedEventsCount)} />
              <ProfileStat label="Followers" value={String(profile.followersCount ?? 0)} />
              <ProfileStat label="Interests" value={String(interests.length)} />
            </View>
          </View>
        </View>

        <View style={styles.profileTextBlock}>
          <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profileName}</Text>
          <Text style={[styles.profileBio, { color: theme.colors.textPrimary }]}>
            {profile.bio || 'This member has not added a bio yet.'}
          </Text>
        </View>
      </View>

      {followerPreview.length > 0 ? (
        <View style={styles.followedRow}>
          <View style={styles.followerStack}>
            {followerPreview.map((follow, index) => (
              <View key={follow.followId} style={[styles.followerWrap, { marginLeft: index === 0 ? 0 : -10 }]}>
                <ProfileAvatar
                  imageUrl={follow.follower?.profile_picture}
                  label={getDisplayName(follow.follower)}
                  size={30}
                />
              </View>
            ))}
          </View>
          <Text style={[styles.followedCopy, { color: theme.colors.textSecondary }]}>
            Followed by {getDisplayName(followerPreview[0]?.follower)}
            {followers.length > 1 ? ` + ${followers.length - 1} more` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.profileActionsRow}>
        <ProfileActionButton
          icon={isOwnProfile ? 'edit-2' : isFollowing || isPending ? 'user-check' : 'user-plus'}
          label={
            isOwnProfile
              ? 'Edit profile'
              : !isAuthenticated
                ? 'Login to follow'
                : isFollowing
                  ? 'Following'
                  : isPending
                    ? 'Requested'
                    : 'Follow'
          }
          onPress={handleFollowPress}
        />
        <ProfileActionButton
          icon={isOwnProfile ? 'settings' : 'message-circle'}
          label={isOwnProfile ? 'Settings' : 'Message'}
          onPress={handleMessagePress}
        />
      </View>

      {interests.length > 0 ? (
        <DetailSection title="Interests">
          <View style={styles.interestWrap}>
            {interests.map((interest) => (
              <View
                key={interest.eventCategoryId}
                style={[
                  styles.interestPill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.interestText, { color: theme.colors.textPrimary }]}>{interest.name}</Text>
              </View>
            ))}
          </View>
        </DetailSection>
      ) : null}

      {shouldShowEventActivityError ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load this member’s event activity."
          onPressAction={() => void Promise.all([refetchEvents(), refetchParticipantOccurrences()])}
        />
      ) : (
        <SwipePagerTabs routes={profileRoutes} variant="icon" />
      )}
    </PageContainer>
  );
}

function PublicProfileTabPane({
  emptyMessage,
  loading,
  occurrences,
  onPressEvent,
}: {
  emptyMessage: string;
  loading: boolean;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
}) {
  if (loading && occurrences.length === 0) {
    return <StateNotice message="Loading event activity..." />;
  }

  if (!occurrences.length) {
    return <StateNotice message={emptyMessage} />;
  }

  return <EventTileGrid occurrences={occurrences} onPressEvent={onPressEvent} />;
}

const styles = StyleSheet.create({
  followedCopy: {
    ...typography.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  followedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: -16,
  },
  followerStack: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  followerWrap: {
    position: 'relative',
  },
  interestPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  interestText: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  interestWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  profileBio: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  profileHeaderSection: {
    gap: 14,
  },
  profileIdentityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileName: {
    ...typography.displayBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  profileTextBlock: {
    gap: 4,
  },
  profileTopHandle: {
    ...typography.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  profileTopRail: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 88,
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -12,
  },
});
