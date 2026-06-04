import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { FollowTargetType } from '@data/graphql/types/graphql';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { GetUserEventMomentsDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileUserEventMoment } from '@data/graphql/query/EventMoment/types';
import { GetUserProfileByIdDocument } from '@data/graphql/query/User/query';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { ProfileEventsEmptyState } from '@/components/account/ProfileEventsEmptyState';
import type { ProfileEventsEmptyStateConfig } from '@/components/account/ProfileEventsEmptyState';
import { ProfileBadge } from '@/components/account/ProfileBadge';
import { ProfileActionButton } from '@/components/account/ProfileActionButton';
import { ProfileStat } from '@/components/account/ProfileStat';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { PageContainer } from '@/components/core/PageContainer';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { DetailSection } from '@/components/details/DetailSection';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { MomentAvatarTrigger } from '@/components/moments/MomentAvatarTrigger';
import { MomentViewer } from '@/components/moments/MomentViewer';
import { AccountScreenSkeleton } from '@/components/skeleton/AccountScreenSkeleton';
import { EventTileGridSkeleton } from '@/components/skeleton/EventTileGridSkeleton';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useHostedEventsByUser } from '@/hooks/events/useHostedEventsByUser';
import { useUserEventOccurrences } from '@/hooks/events/useUserEventOccurrences';
import { useFollowTarget } from '@/hooks/follow/useFollowTarget';
import { useUserMoments } from '@/hooks/moments/useUserMoments';
import { getApolloAuthContext } from '@/lib/auth';
import { buildProfileBadges } from '@/lib/account/profileBadges';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

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
  const apolloClient = useApolloClient();
  const {
    userId,
    username: routeUsername,
    displayName: routeDisplayName,
    avatarUrl,
    openMoments = false,
  } = route.params;
  const isOwnProfile = viewerUserId === userId;
  const [activeTab, setActiveTab] = useState<PublicProfileTab>('going');
  const [fallbackMoments, setFallbackMoments] = useState<MobileUserEventMoment[]>([]);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const autoOpenedMomentsRef = useRef(false);
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
  const followerPreview = useMemo(
    () => followers.filter((follow) => Boolean(follow.follower)).slice(0, 3),
    [followers],
  );
  const { follow, isFollowing, isPending, unfollow } = useFollowTarget({
    authToken,
    targetId: userId,
    targetType: FollowTargetType.User,
  });
  const {
    error: hostedEventsError,
    hostedEvents,
    hasMore: hostedEventsHasMore,
    loading: hostedEventsLoading,
    loadingMore: hostedEventsLoadingMore,
    loadMore: loadMoreHostedEvents,
    refetch: refetchHostedEvents,
    totalCount: hostedEventsTotalCount,
  } = useHostedEventsByUser(userId, authToken);
  const {
    error: participantEventsError,
    loading: participantEventsLoading,
    occurrences: participantOccurrences,
    pastEvents,
    refetch: refetchParticipantOccurrences,
    upcomingEvents,
  } = useUserEventOccurrences(userId, authToken);
  const {
    loading: userMomentsLoading,
    moments: userMoments,
    refetch: refetchUserMoments,
  } = useUserMoments(userId, authToken);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchHostedEvents(), refetchParticipantOccurrences(), refetchUserMoments()]);
    }, [refetch, refetchHostedEvents, refetchParticipantOccurrences, refetchUserMoments]),
  );

  const profileName = getDisplayName(profile) || routeDisplayName || routeUsername || '';
  const badges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);
  const interests = useMemo(
    () => (isOwnProfile ? (profile?.interests?.filter(Boolean) ?? []) : []),
    [isOwnProfile, profile?.interests],
  );
  const hostedEventsCount = hostedEventsTotalCount;
  const participantActivityUnsupported = isUnsupportedUserEventOccurrencesError(participantEventsError);
  const shouldShowParticipantTabs = !participantActivityUnsupported;
  const profileTabs = useMemo<Record<PublicProfileTab, MobileEventOccurrence[]>>(
    () => ({
      going: upcomingEvents,
      past: pastEvents,
      hosting: hostedEvents,
    }),
    [hostedEvents, pastEvents, upcomingEvents],
  );
  const candidateMomentEventIds = useMemo(
    () =>
      [
        ...new Set(
          [...hostedEvents, ...participantOccurrences]
            .map((occurrence) => occurrence.eventSeries?.eventId ?? occurrence.eventSeriesId)
            .filter((eventId): eventId is string => Boolean(eventId)),
        ),
      ].slice(0, 8),
    [hostedEvents, participantOccurrences],
  );
  const profileRoutes = useMemo(
    () =>
      (
        [
          ...(shouldShowParticipantTabs
            ? ([
                {
                  emptyState: {
                    ctaLabel: 'Explore Events',
                    description: 'RSVP to the events that matter and they will start building this activity trail.',
                    icon: 'check-square',
                    title: 'No upcoming events',
                  },
                  icon: 'check-square',
                  key: 'going',
                  label: 'RSVPs',
                  count: upcomingEvents.length,
                },
                {
                  emptyState: {
                    ctaLabel: 'Explore Events',
                    description: 'Real-world attendance turns into visible history once this member starts showing up.',
                    icon: 'clock',
                    title: 'No attended events',
                  },
                  icon: 'clock',
                  key: 'past',
                  label: 'Attended',
                  count: pastEvents.length,
                },
              ] as const)
            : []),
          {
            emptyState: {
              ctaLabel: isOwnProfile ? 'Create Your First Event' : 'Explore Events',
              description: 'Hosted events will appear here once this member starts pulling people together.',
              icon: 'calendar',
              title: 'No events hosted yet',
            },
            icon: 'calendar',
            key: 'hosting',
            label: 'Hosted',
            count: hostedEventsTotalCount,
          },
        ] as const
      ).map((route) => ({
        ...route,
        render: () => (
          <PublicProfileTabPane
            emptyState={route.emptyState}
            loading={route.key === 'hosting' ? hostedEventsLoading : participantEventsLoading}
            loadingMore={route.key === 'hosting' ? hostedEventsLoadingMore : false}
            onPressCta={() =>
              route.key === 'hosting' && isOwnProfile
                ? navigation.navigate('CreateEvent')
                : navigation.navigate('MainTabs', { screen: 'Events' })
            }
            occurrences={profileTabs[route.key]}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
          />
        ),
      })),
    [
      hostedEventsLoading,
      hostedEventsLoadingMore,
      navigation,
      participantEventsLoading,
      profileTabs,
      shouldShowParticipantTabs,
      isOwnProfile,
      hostedEventsTotalCount,
      pastEvents.length,
      upcomingEvents.length,
    ],
  );
  const shouldShowEventActivityError =
    Boolean(hostedEventsError) || (Boolean(participantEventsError) && !participantActivityUnsupported);
  const visibleUserMoments = userMoments.length > 0 ? userMoments : fallbackMoments;
  const infiniteScroll = useInfiniteScroll({
    enabled: activeTab === 'hosting' && hostedEventsHasMore,
    loading: hostedEventsLoading || hostedEventsLoadingMore,
    onEndReached: loadMoreHostedEvents,
    resetKey: `${activeTab}:${hostedEvents.length}`,
  });

  useEffect(() => {
    if (!openMoments || autoOpenedMomentsRef.current || userMomentsLoading || visibleUserMoments.length === 0) {
      return;
    }

    autoOpenedMomentsRef.current = true;
    setMomentsOpen(true);
  }, [openMoments, userMomentsLoading, visibleUserMoments.length]);

  useEffect(() => {
    let cancelled = false;

    if (
      !userId ||
      !authToken ||
      !isAuthenticated ||
      userMomentsLoading ||
      userMoments.length > 0 ||
      candidateMomentEventIds.length === 0
    ) {
      setFallbackMoments([]);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const results = await Promise.all(
        candidateMomentEventIds.map((eventId) =>
          apolloClient
            .query({
              fetchPolicy: 'network-only',
              query: GetUserEventMomentsDocument,
              variables: { eventId, userId },
              ...getApolloAuthContext(authToken),
            })
            .catch(() => null),
        ),
      );

      if (cancelled) {
        return;
      }

      const mergedMoments = [
        ...new Map(
          results
            .flatMap((result) => result?.data?.readUserEventMoments ?? [])
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
            .map((moment) => [moment.momentId, moment]),
        ).values(),
      ];

      setFallbackMoments(mergedMoments);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    apolloClient,
    authToken,
    candidateMomentEventIds,
    isAuthenticated,
    userId,
    userMoments.length,
    userMomentsLoading,
  ]);

  const handleFollowPress = () => {
    if (isOwnProfile) {
      navigation.navigate('Settings', { initialTab: 'profile' });
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

  const openHostedEvents = () => {
    navigation.navigate('UserHostedEvents', {
      displayName: profileName,
      totalCount: hostedEventsTotalCount,
      userId,
      username: profile?.username ?? routeUsername,
    });
  };

  const openConnections = (mode: 'followers' | 'following', totalCount?: number) => {
    navigation.navigate('UserConnections', {
      displayName: profileName,
      mode,
      totalCount,
      userId,
      username: profile?.username ?? routeUsername,
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
    <PageContainer
      onContentSizeChange={infiniteScroll.onContentSizeChange}
      onRefresh={onRefresh}
      onScroll={infiniteScroll.onScroll}
      refreshing={refreshing}
      scrollEventThrottle={infiniteScroll.scrollEventThrottle}
    >
      <View style={styles.profileHeaderSection}>
        <View style={styles.profileTopRow}>
          {visibleUserMoments.length > 0 ? (
            <MomentAvatarTrigger author={profile} label={profileName} onPress={() => setMomentsOpen(true)} size={88} />
          ) : (
            <ProfileAvatar imageUrl={profile.profile_picture ?? avatarUrl} label={profileName} size={88} />
          )}

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
              <ProfileStat label="Events" onPress={openHostedEvents} value={String(hostedEventsCount)} />
              <ProfileStat
                label="Followers"
                onPress={() => openConnections('followers', profile.followersCount ?? 0)}
                value={String(profile.followersCount ?? 0)}
              />
              <ProfileStat
                label="Following"
                onPress={() => openConnections('following', profile.followingCount ?? 0)}
                value={String(profile.followingCount ?? 0)}
              />
            </View>
          </View>
        </View>

        <View style={styles.profileTextBlock}>
          <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profileName}</Text>
          <Text style={[styles.profileBio, { color: theme.colors.textPrimary }]}>
            {profile.bio || 'This member has not added a short intro yet.'}
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
          onPressAction={() => void Promise.all([refetchHostedEvents(), refetchParticipantOccurrences()])}
        />
      ) : (
        <SwipePagerTabs
          onActiveKeyChange={(key) => setActiveTab(key as PublicProfileTab)}
          persistenceKey={`user-profile-events:${viewerUserId ?? 'guest'}:${userId}`}
          routes={profileRoutes}
          variant="icon"
        />
      )}

      {momentsOpen && (
        <MomentViewer moments={visibleUserMoments} onClose={() => setMomentsOpen(false)} open startIndex={0} />
      )}
    </PageContainer>
  );
}

function PublicProfileTabPane({
  emptyState,
  loading,
  loadingMore = false,
  onPressCta,
  occurrences,
  onPressEvent,
}: {
  emptyState: ProfileEventsEmptyStateConfig;
  loading: boolean;
  loadingMore?: boolean;
  onPressCta?: () => void;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
}) {
  const { theme } = useAppTheme();

  if (loading && occurrences.length === 0) {
    return <EventTileGridSkeleton count={6} />;
  }

  if (!occurrences.length) {
    return (
      <ProfileEventsEmptyState
        ctaLabel={emptyState.ctaLabel}
        description={emptyState.description}
        icon={emptyState.icon}
        onPressCta={onPressCta}
        title={emptyState.title}
      />
    );
  }

  return (
    <View style={styles.profileEventsSection}>
      <EventTileGrid occurrences={occurrences} onPressEvent={onPressEvent} />
      {loadingMore ? (
        <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>Loading more…</Text>
      ) : null}
    </View>
  );
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
  loadingMoreText: {
    ...typography.bodyMedium,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
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
  profileEventsSection: {
    gap: 4,
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
