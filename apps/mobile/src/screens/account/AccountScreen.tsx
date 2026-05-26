import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileEventsEmptyState } from '@/components/account/ProfileEventsEmptyState';
import type { ProfileEventsEmptyStateConfig } from '@/components/account/ProfileEventsEmptyState';
import { ProfileBadge } from '@/components/account/ProfileBadge';
import { ProfileActionButton } from '@/components/account/ProfileActionButton';
import { ProfileStat } from '@/components/account/ProfileStat';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { MomentAvatarTrigger } from '@/components/moments/MomentAvatarTrigger';
import { MomentViewer } from '@/components/moments/MomentViewer';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useHostedEventsByUser } from '@/hooks/events/useHostedEventsByUser';
import { useMyEventOccurrenceRsvps } from '@/hooks/events/useMyEventOccurrenceRsvps';
import { useSavedEvents } from '@/hooks/events/useSavedEvents';
import { useUserMoments } from '@/hooks/moments/useUserMoments';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { buildProfileBadges } from '@/lib/account/profileBadges';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type AccountTab = 'going' | 'past' | 'hosting' | 'saved';

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated, userId, username } = useAppShell();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<AccountTab>('going');
  const [momentsOpen, setMomentsOpen] = useState(false);
  const {
    error: profileError,
    loading: profileLoading,
    profile,
    refetch: refetchProfile,
  } = usePreviewProfile(username, isAuthenticated);
  const profileUserId = profile?.userId ?? userId ?? undefined;
  const { moments: userMoments } = useUserMoments(isAuthenticated ? profileUserId : undefined, authToken);
  const {
    error: hostedEventsError,
    hostedEvents,
    hasMore: hostedEventsHasMore,
    loading: hostedEventsLoading,
    loadingMore: hostedEventsLoadingMore,
    loadMore: loadMoreHostedEvents,
    refetch: refetchHostedEvents,
    totalCount: hostedEventsTotalCount,
  } = useHostedEventsByUser(profileUserId, authToken);
  const {
    error: myOccurrenceRsvpsError,
    loading: myOccurrenceRsvpsLoading,
    pastEvents: pastRsvpEvents,
    refetch: refetchMyOccurrenceRsvps,
    upcomingEvents: upcomingRsvpEvents,
  } = useMyEventOccurrenceRsvps(authToken, false);
  const {
    error: savedEventsError,
    loading: savedEventsLoading,
    refetch: refetchSavedEvents,
    savedEvents,
  } = useSavedEvents(authToken);
  const profileName = getDisplayName(profile);
  const profileEventsCount = hostedEventsTotalCount;
  const profileBadges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);
  const openHostedEvents = useCallback(() => {
    if (!profileUserId) {
      return;
    }

    navigation.navigate('UserHostedEvents', {
      displayName: profileName,
      totalCount: hostedEventsTotalCount,
      userId: profileUserId,
      username: profile?.username ?? username,
    });
  }, [hostedEventsTotalCount, navigation, profile?.username, profileName, profileUserId, username]);
  const openConnections = useCallback(
    (mode: 'followers' | 'following', totalCount?: number) => {
      if (!profileUserId) {
        return;
      }

      navigation.navigate('UserConnections', {
        displayName: profileName,
        mode,
        totalCount,
        userId: profileUserId,
        username: profile?.username ?? username,
      });
    },
    [navigation, profile?.username, profileName, profileUserId, username],
  );

  const eventCollections = useMemo<Record<AccountTab, MobileEventOccurrence[]>>(
    () => ({
      going: upcomingRsvpEvents,
      past: pastRsvpEvents,
      hosting: hostedEvents,
      saved: savedEvents,
    }),
    [hostedEvents, pastRsvpEvents, savedEvents, upcomingRsvpEvents],
  );
  const eventCollectionsLoading = hostedEventsLoading || myOccurrenceRsvpsLoading || savedEventsLoading;
  const eventCollectionsError = hostedEventsError || myOccurrenceRsvpsError || savedEventsError;
  const refetchEventCollections = useCallback(async () => {
    await Promise.all([refetchHostedEvents(), refetchMyOccurrenceRsvps(), refetchSavedEvents()]);
  }, [refetchHostedEvents, refetchMyOccurrenceRsvps, refetchSavedEvents]);
  const infiniteScroll = useInfiniteScroll({
    enabled: activeTab === 'hosting' && hostedEventsHasMore,
    loading: hostedEventsLoading || hostedEventsLoadingMore,
    onEndReached: loadMoreHostedEvents,
    resetKey: `${activeTab}:${hostedEvents.length}`,
  });

  const accountRoutes = useMemo(
    () =>
      (
        [
          {
            emptyState: {
              ctaLabel: 'Explore Events',
              description: "RSVP to events and they'll appear here",
              icon: 'check-square',
              title: 'No upcoming events',
            },
            icon: 'check-square',
            key: 'going',
            label: 'Going',
          },
          {
            emptyState: {
              ctaLabel: 'Explore Events',
              description: "Events you've attended will show up here",
              icon: 'clock',
              title: 'No attended events',
            },
            icon: 'clock',
            key: 'past',
            label: 'Past',
          },
          {
            emptyState: {
              ctaLabel: 'Create Your First Event',
              description: "Start hosting events and they'll appear here",
              icon: 'calendar',
              title: 'No events hosted yet',
            },
            icon: 'calendar',
            key: 'hosting',
            label: 'Hosting',
          },
          {
            emptyState: {
              ctaLabel: 'Explore Events',
              description: "Bookmark events you're interested in to view them later",
              icon: 'bookmark',
              title: 'No saved events yet',
            },
            icon: 'bookmark',
            key: 'saved',
            label: 'Saved',
          },
        ] as const
      ).map((route) => ({
        ...route,
        render: () => (
          <AccountTabPane
            emptyState={route.emptyState}
            loading={eventCollectionsLoading}
            loadingMore={route.key === 'hosting' ? hostedEventsLoadingMore : false}
            onPressCta={() =>
              route.key === 'hosting' ? navigation.navigate('CreateEvent') : navigation.navigate('Events')
            }
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
            occurrences={eventCollections[route.key]}
          />
        ),
      })),
    [eventCollections, eventCollectionsLoading, hostedEventsLoadingMore, navigation],
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="Join Gatherle" />
        <AuthPromptCard
          description="Create an account to save events, manage your profile, host organizations, and unlock messaging and notifications."
          onPressPrimary={() => navigation.navigate('Register')}
          onPressSecondary={() => navigation.navigate('Login')}
          primaryLabel="Create account"
          secondaryLabel="Login"
          title="Your account hub starts here"
        />
      </PageContainer>
    );
  }

  if (!username) {
    return (
      <PageContainer>
        <PageHeading title="Account" />
        <StateNotice message="Your account needs a username before we can load the full mobile profile." />
      </PageContainer>
    );
  }

  if (profileLoading && !profile) {
    return (
      <PageContainer>
        <PageHeading title="Account" />
        <StateNotice message="Loading your profile..." />
      </PageContainer>
    );
  }

  if (profileError && !profile) {
    return (
      <PageContainer>
        <PageHeading title="Account" />
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your profile."
          onPressAction={() => void refetchProfile()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      onContentSizeChange={infiniteScroll.onContentSizeChange}
      onScroll={infiniteScroll.onScroll}
      scrollEventThrottle={infiniteScroll.scrollEventThrottle}
    >
      <View style={styles.profileHeaderSection}>
        <View style={styles.profileTopRow}>
          {userMoments.length > 0 ? (
            <MomentAvatarTrigger author={profile} label={profileName} onPress={() => setMomentsOpen(true)} size={88} />
          ) : (
            <Pressable
              accessibilityLabel="View your moments"
              disabled={!profileUserId}
              onPress={() => {
                if (!profileUserId) {
                  return;
                }

                navigation.navigate('UserProfile', {
                  avatarUrl: profile?.profile_picture,
                  displayName: profileName,
                  openMoments: true,
                  userId: profileUserId,
                  username: profile?.username ?? username,
                });
              }}
              style={styles.avatarButton}
            >
              <ProfileAvatar imageUrl={profile?.profile_picture} label={profileName} size={88} />
            </Pressable>
          )}

          <View style={styles.profileTopRail}>
            <View style={styles.profileIdentityRow}>
              <Text numberOfLines={1} style={[styles.profileTopHandle, { color: theme.colors.textPrimary }]}>
                @{profile?.username ?? username}
              </Text>

              {profileBadges.length > 0 ? (
                <View style={styles.profileBadgesRow}>
                  {profileBadges.map((badge) => (
                    <ProfileBadge badge={badge} key={badge.label} />
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.profileStatsRow}>
              <ProfileStat label="Events" onPress={openHostedEvents} value={String(profileEventsCount)} />
              <ProfileStat
                label="Followers"
                onPress={() => openConnections('followers', profile?.followersCount ?? 0)}
                value={String(profile?.followersCount ?? 0)}
              />
              <ProfileStat
                label="Following"
                onPress={() => openConnections('following', profile?.followingCount ?? 0)}
                value={String(profile?.followingCount ?? 0)}
              />
            </View>
          </View>
        </View>

        <View style={styles.profileTextBlock}>
          <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profileName}</Text>
          <Text style={[styles.profileBio, { color: theme.colors.textPrimary }]}>
            {profile?.bio || 'No bio added yet.'}
          </Text>
        </View>
      </View>

      <View style={styles.profileActionsRow}>
        <ProfileActionButton
          icon="edit-2"
          label="Edit profile"
          onPress={() => navigation.navigate('Settings', { initialTab: 'profile' })}
        />
        <ProfileActionButton
          icon="settings"
          label="Settings"
          onPress={() => navigation.navigate('Settings', { initialTab: 'account' })}
        />
      </View>

      {eventCollectionsError ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your account event collections."
          onPressAction={() => void refetchEventCollections()}
        />
      ) : (
        <SwipePagerTabs
          onActiveKeyChange={(key) => setActiveTab(key as AccountTab)}
          routes={accountRoutes}
          variant="icon"
        />
      )}

      {momentsOpen ? (
        <MomentViewer moments={userMoments} onClose={() => setMomentsOpen(false)} open startIndex={0} />
      ) : null}
    </PageContainer>
  );
}

function AccountTabPane({
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
    return <StateNotice message="Loading your account activity..." />;
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
      <View style={styles.profileEventGrid}>
        <EventTileGrid occurrences={occurrences} onPressEvent={onPressEvent} />
      </View>
      {loadingMore ? (
        <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>Loading more…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    ...typography.bodyMedium,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  profileBio: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  profileEventGrid: {
    marginTop: -14,
  },
  profileEventsSection: {
    gap: 4,
  },
  profileBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  profileActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -12,
  },
  profileTextBlock: {
    gap: 4,
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
});
