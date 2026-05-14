import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { buildProfileBadges } from '@/lib/account/profileBadges';
import { dedupeOccurrencesBySeries, getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type AccountTab = 'going' | 'past' | 'hosting' | 'saved';

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated, userId, username } = useAppShell();
  const { theme } = useAppTheme();
  const { error, loading, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery(authToken);
  const {
    error: profileError,
    loading: profileLoading,
    profile,
    refetch: refetchProfile,
  } = usePreviewProfile(username, isAuthenticated);
  const profileName = getDisplayName(profile);
  const profileEventsCount = useMemo(
    () => dedupeOccurrencesBySeries([...upcomingEvents, ...trendingEvents]).length,
    [trendingEvents, upcomingEvents],
  );
  const profileBadges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);

  const eventCollections = useMemo<Record<AccountTab, MobileEventOccurrence[]>>(
    () => ({
      going: upcomingEvents.filter((occurrence) => occurrence.myRsvp?.status).slice(0, 6),
      past: trendingEvents.slice(0, 4),
      hosting: dedupeOccurrencesBySeries(
        [...upcomingEvents, ...trendingEvents].filter((occurrence) =>
          occurrence.eventSeries?.organizers?.some((organizer) => organizer.user?.userId === userId),
        ),
        6,
      ),
      saved: dedupeOccurrencesBySeries(
        [...trendingEvents, ...upcomingEvents].filter((occurrence) => occurrence.eventSeries?.isSavedByMe),
        6,
      ),
    }),
    [trendingEvents, upcomingEvents, userId],
  );

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
            loading={loading}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
            occurrences={eventCollections[route.key]}
          />
        ),
      })),
    [eventCollections, loading, navigation],
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
          <ProfileAvatar imageUrl={profile?.profile_picture} label={profileName} size={88} />

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

      {error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your account event collections."
          onPressAction={() => void refetch()}
        />
      ) : (
        <SwipePagerTabs routes={accountRoutes} variant="icon" />
      )}
    </PageContainer>
  );
}

function AccountTabPane({
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
    return <StateNotice message="Loading your account activity..." />;
  }

  if (!occurrences.length) {
    return <StateNotice message={emptyMessage} />;
  }

  return (
    <View style={styles.profileEventGrid}>
      {occurrences.map((event) => (
        <ProfileEventTile key={event.occurrenceId} occurrence={event} onPress={() => onPressEvent(event)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
