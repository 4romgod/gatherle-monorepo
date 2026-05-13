import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AccountTabButton } from '@/components/account/AccountTabButton';
import { ProfileBadge } from '@/components/account/ProfileBadge';
import { ProfileActionButton } from '@/components/account/ProfileActionButton';
import { ProfileEventTile } from '@/components/account/ProfileEventTile';
import { ProfileStat } from '@/components/account/ProfileStat';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { buildProfileBadges } from '@/lib/account/profileBadges';
import { dedupeOccurrencesBySeries, getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type AccountTab = 'going' | 'past' | 'hosting' | 'saved';

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated, username } = useAppShell();
  const { theme } = useAppTheme();
  const { error, loading, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery(authToken);
  const {
    error: profileError,
    loading: profileLoading,
    profile,
    refetch: refetchProfile,
  } = usePreviewProfile(username, isAuthenticated);
  const [activeTab, setActiveTab] = useState<AccountTab>('going');
  const profileName = getDisplayName(profile);
  const profileEventsCount = useMemo(
    () => dedupeOccurrencesBySeries([...upcomingEvents, ...trendingEvents]).length,
    [trendingEvents, upcomingEvents],
  );
  const profileBadges = useMemo(() => buildProfileBadges({ userRole: profile?.userRole }), [profile?.userRole]);

  const eventCollections = useMemo<Record<AccountTab, MobileEventOccurrence[]>>(
    () => ({
      going: upcomingEvents.slice(0, 4),
      past: trendingEvents.slice(0, 4),
      hosting: dedupeOccurrencesBySeries([...upcomingEvents.slice(1), ...trendingEvents], 4),
      saved: dedupeOccurrencesBySeries([...trendingEvents.slice(1), ...upcomingEvents], 4),
    }),
    [trendingEvents, upcomingEvents],
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

      <View style={[styles.accountTabsRow, { borderBottomColor: theme.colors.border }]}>
        <AccountTabButton active={activeTab === 'going'} icon="check-square" onPress={() => setActiveTab('going')} />
        <AccountTabButton active={activeTab === 'past'} icon="clock" onPress={() => setActiveTab('past')} />
        <AccountTabButton active={activeTab === 'hosting'} icon="calendar" onPress={() => setActiveTab('hosting')} />
        <AccountTabButton active={activeTab === 'saved'} icon="bookmark" onPress={() => setActiveTab('saved')} />
      </View>

      {loading && eventCollections[activeTab].length === 0 ? (
        <StateNotice message="Loading your account activity..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your account event collections."
          onPressAction={() => void refetch()}
        />
      ) : eventCollections[activeTab].length > 0 ? (
        <View style={styles.profileEventGrid}>
          {eventCollections[activeTab].map((event) => (
            <ProfileEventTile
              key={event.occurrenceId}
              occurrence={event}
              onPress={() => navigation.navigate('EventDetails', { occurrence: event })}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="This section will populate as you RSVP, host, and save more events." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  accountTabsRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: -10,
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
