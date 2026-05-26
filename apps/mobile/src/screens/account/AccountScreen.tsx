import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileBadge } from '@/components/account/ProfileBadge';
import { ProfileActionButton } from '@/components/account/ProfileActionButton';
import { ProfileEventTile } from '@/components/account/ProfileEventTile';
import { ProfileStat } from '@/components/account/ProfileStat';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { MomentAvatarTrigger } from '@/components/moments/MomentAvatarTrigger';
import { MomentViewer } from '@/components/moments/MomentViewer';
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
  const { width } = useWindowDimensions();
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
  const profileEventsCount = hostedEvents.length;
  const profileBadges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);
  const profileTileSize = useMemo(() => Math.floor((width - 40 - 12) / 3), [width]);

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

  const accountRoutes = useMemo(
    () =>
      (
        [
          { icon: 'check-square', key: 'going', label: 'Going' },
          { icon: 'clock', key: 'past', label: 'Past' },
          { icon: 'calendar', key: 'hosting', label: 'Hosting' },
          { icon: 'bookmark', key: 'saved', label: 'Saved' },
        ] as const
      ).map((route) => ({
        ...route,
        render: () => (
          <AccountTabPane
            emptyMessage={
              route.key === 'going'
                ? 'This section will populate as you RSVP to more events.'
                : route.key === 'past'
                  ? 'Past events will show here after you build more history.'
                  : route.key === 'hosting'
                    ? 'Hosting activity will appear here when your events go live.'
                    : 'Saved events will show here as you bookmark more plans.'
            }
            hasMore={route.key === 'hosting' ? hostedEventsHasMore : false}
            loading={eventCollectionsLoading}
            loadingMore={route.key === 'hosting' ? hostedEventsLoadingMore : false}
            onLoadMore={route.key === 'hosting' ? loadMoreHostedEvents : undefined}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
            occurrences={eventCollections[route.key]}
            tileSize={profileTileSize}
          />
        ),
      })),
    [
      eventCollections,
      eventCollectionsLoading,
      hostedEventsHasMore,
      hostedEventsLoadingMore,
      loadMoreHostedEvents,
      navigation,
      profileTileSize,
    ],
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
    <PageContainer>
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
              <ProfileStat label="Events" value={String(profileEventsCount)} />
              <ProfileStat label="Followers" value={String(profile?.followersCount ?? 0)} />
              <ProfileStat label="Interests" value={String(profile?.interests?.length ?? 0)} />
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
        <ProfileActionButton icon="edit-2" label="Edit profile" onPress={() => navigation.navigate('Profile')} />
        <ProfileActionButton icon="settings" label="Settings" onPress={() => navigation.navigate('Settings')} />
      </View>

      {eventCollectionsError ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your account event collections."
          onPressAction={() => void refetchEventCollections()}
        />
      ) : (
        <SwipePagerTabs routes={accountRoutes} variant="icon" />
      )}

      {momentsOpen ? (
        <MomentViewer moments={userMoments} onClose={() => setMomentsOpen(false)} open startIndex={0} />
      ) : null}
    </PageContainer>
  );
}

function AccountTabPane({
  emptyMessage,
  hasMore = false,
  loading,
  loadingMore = false,
  onLoadMore,
  occurrences,
  onPressEvent,
  tileSize,
}: {
  emptyMessage: string;
  hasMore?: boolean;
  loading: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
  tileSize: number;
}) {
  const { theme } = useAppTheme();

  if (loading && occurrences.length === 0) {
    return <StateNotice message="Loading your account activity..." />;
  }

  if (!occurrences.length) {
    return <StateNotice message={emptyMessage} />;
  }

  return (
    <View style={styles.profileEventsSection}>
      <View style={styles.profileEventGrid}>
        {occurrences.map((event) => (
          <ProfileEventTile
            key={event.occurrenceId}
            occurrence={event}
            onPress={() => onPressEvent(event)}
            size={tileSize}
          />
        ))}
      </View>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          onPress={onLoadMore}
          style={({ pressed }) => [
            styles.loadMoreButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <Text style={[styles.loadMoreButtonText, { color: theme.colors.textPrimary }]}>
            {loadingMore ? 'Loading more…' : 'Show more events'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadMoreButtonText: {
    ...typography.bodySemiBold,
    fontSize: 14,
  },
  profileBio: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  profileEventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
