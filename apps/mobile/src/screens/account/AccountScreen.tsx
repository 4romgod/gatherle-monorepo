import type { ApolloError } from '@apollo/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { UserRole } from '@data/graphql/types/graphql';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AccountSheet } from '@/components/account/AccountSheet';
import { ProfileEventsEmptyState } from '@/components/account/ProfileEventsEmptyState';
import type { ProfileEventsEmptyStateConfig } from '@/components/account/ProfileEventsEmptyState';
import { ProfileBadge } from '@/components/account/ProfileBadge';
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
import { isInvalidSessionError } from '@/lib/auth/sessionValidation';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AccountTab = 'going' | 'past' | 'hosting' | 'saved';

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, hasLiveSession, isAuthenticated, signOut, userId, username } = useAppShell();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<AccountTab>('going');
  const [accountSheetVisible, setAccountSheetVisible] = useState(false);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const {
    error: profileError,
    loading: profileLoading,
    profile,
    refetch: refetchProfile,
  } = usePreviewProfile(userId, authToken, isAuthenticated);
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
  const isAdmin = profile?.userRole === UserRole.Admin;
  const profileEventsCount = hostedEventsTotalCount;
  const profileBadges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);
  const interests = useMemo(() => profile?.interests?.filter(Boolean) ?? [], [profile?.interests]);
  const hasInvalidSessionProfileError = Boolean(profileError && isInvalidSessionError(profileError as ApolloError));
  const hasMismatchedSessionIdentity = Boolean(profile?.userId && userId && profile.userId !== userId);

  useEffect(() => {
    if (!hasLiveSession) {
      return;
    }

    if (!hasInvalidSessionProfileError && !hasMismatchedSessionIdentity) {
      return;
    }

    signOut();
    navigation.navigate('Login', { redirectTab: 'Account' });
  }, [hasInvalidSessionProfileError, hasLiveSession, hasMismatchedSessionIdentity, navigation, signOut]);
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
              description: 'Lock in the events you refuse to miss and they will stay one tap away here.',
              icon: 'check-square',
              title: 'No upcoming events',
            },
            icon: 'check-square',
            key: 'going',
            label: 'RSVPs',
            count: upcomingRsvpEvents.length,
          },
          {
            emptyState: {
              ctaLabel: 'Explore Events',
              description: 'Every event you actually attend becomes part of your personal activity history.',
              icon: 'clock',
              title: 'No attended events',
            },
            icon: 'clock',
            key: 'past',
            label: 'Attended',
            count: pastRsvpEvents.length,
          },
          {
            emptyState: {
              ctaLabel: 'Create Your First Event',
              description: 'Publish something worth showing up for and build momentum around your own gathering.',
              icon: 'calendar',
              title: 'No events hosted yet',
            },
            icon: 'calendar',
            key: 'hosting',
            label: 'Hosted',
            count: hostedEventsTotalCount,
          },
          {
            emptyState: {
              ctaLabel: 'Explore Events',
              description: 'Save the events that spark curiosity so you can come back when the timing feels right.',
              icon: 'bookmark',
              title: 'No saved events yet',
            },
            icon: 'bookmark',
            key: 'saved',
            label: 'Saved',
            count: savedEvents.length,
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
  const accountToolbarProps = isAuthenticated
    ? {
        center: <Text style={[styles.toolbarTitle, { color: theme.colors.textPrimary }]}>Account</Text>,
        right: (
          <View style={styles.toolbarActions}>
            <HeaderIconButton
              accessibilityLabel="Create event"
              icon="plus-circle"
              onPress={() => navigation.navigate('CreateEvent')}
            />
            <HeaderIconButton
              accessibilityLabel="Open account actions"
              icon="more-horizontal"
              onPress={() => setAccountSheetVisible(true)}
            />
          </View>
        ),
      }
    : undefined;

  if (!isAuthenticated) {
    return (
      <MainTabScreenLayout>
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
      </MainTabScreenLayout>
    );
  }

  if (!userId) {
    return (
      <MainTabScreenLayout toolbarProps={accountToolbarProps}>
        <PageContainer>
          <PageHeading title="Account" />
          <StateNotice message="Your account session is missing profile identity. Please sign in again." />
        </PageContainer>
      </MainTabScreenLayout>
    );
  }

  if (profileLoading && !profile) {
    return (
      <MainTabScreenLayout toolbarProps={accountToolbarProps}>
        <PageContainer>
          <PageHeading title="Account" />
          <StateNotice message="Loading your profile..." />
        </PageContainer>
      </MainTabScreenLayout>
    );
  }

  if (profileError && !profile) {
    return (
      <MainTabScreenLayout toolbarProps={accountToolbarProps}>
        <PageContainer>
          <PageHeading title="Account" />
          <StateNotice
            actionLabel={hasInvalidSessionProfileError ? 'Continue to login' : 'Retry'}
            message={
              hasInvalidSessionProfileError
                ? 'Your saved session no longer points at an active account. Please sign in again.'
                : 'We couldn’t load your profile.'
            }
            onPressAction={() => {
              if (hasInvalidSessionProfileError) {
                signOut();
                navigation.navigate('Login', { redirectTab: 'Account' });
                return;
              }

              void refetchProfile();
            }}
          />
        </PageContainer>
      </MainTabScreenLayout>
    );
  }

  return (
    <MainTabScreenLayout toolbarProps={accountToolbarProps}>
      <PageContainer
        onContentSizeChange={infiniteScroll.onContentSizeChange}
        onScroll={infiniteScroll.onScroll}
        scrollEventThrottle={infiniteScroll.scrollEventThrottle}
      >
        <View style={styles.profileHeaderSection}>
          <View style={styles.profileTopRow}>
            {userMoments.length > 0 ? (
              <MomentAvatarTrigger
                author={profile}
                label={profileName}
                onPress={() => setMomentsOpen(true)}
                size={88}
              />
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
              {profile?.bio || 'Add a short line so people know what kinds of events and communities pull you in.'}
            </Text>
          </View>

          {interests.length > 0 ? (
            <View style={styles.interestsBlock}>
              <Text style={[styles.interestsLabel, { color: theme.colors.textSecondary }]}>Interests</Text>
              <View style={styles.interestsWrap}>
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
            </View>
          ) : null}
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

      <AccountSheet
        isAdmin={isAdmin}
        onClose={() => setAccountSheetVisible(false)}
        onOpenAdmin={isAdmin ? () => navigation.navigate('Admin') : undefined}
        onOpenOrganizations={() => navigation.navigate('MyOrganizations')}
        onOpenSettings={() => navigation.navigate('Settings', { initialTab: 'account' })}
        onLogout={signOut}
        visible={accountSheetVisible}
      />
    </MainTabScreenLayout>
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
  interestPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  interestText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  interestsBlock: {
    gap: 10,
  },
  interestsLabel: {
    ...typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  interestsWrap: {
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
  profileTextBlock: {
    gap: 4,
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 2,
  },
  toolbarTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.3,
  },
});
