import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthPromptCard } from '@/features/auth/components/AuthPromptCard';
import { EventCard } from '@/features/discovery/components/EventCard';
import { useMobileHomeDiscovery } from '@/features/discovery/hooks/useMobileDiscovery';
import { dedupeOccurrencesBySeries, getDisplayName } from '@/features/discovery/lib/mobileFormatters';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePreviewProfile } from '@/features/session/hooks/usePreviewProfile';
import { ProfileAvatar } from '@/shared/user/ProfileAvatar';
import { PageContainer, PageHeading, StateNotice } from '@/shared/ui/PagePrimitives';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type AccountTab = 'going' | 'past' | 'hosting' | 'saved';

function ProfileStat({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.profileStat}>
      <Text style={[styles.profileStatValue, { color: theme.colors.secondary }]}>{value}</Text>
      <Text style={[styles.profileStatLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AccountTabButton({
  active,
  icon,
  onPress,
}: {
  active: boolean;
  icon: ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.accountTabButton,
        {
          borderBottomColor: active ? theme.colors.primary : 'transparent',
        },
      ]}
    >
      <Feather color={active ? theme.colors.primary : theme.colors.textSecondary} name={icon} size={28} />
    </Pressable>
  );
}

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { isAuthenticated, previewUsername } = useAppShell();
  const { theme } = useAppTheme();
  const { error, loading, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery();
  const {
    error: profileError,
    loading: profileLoading,
    profile,
    refetch: refetchProfile,
  } = usePreviewProfile(previewUsername, isAuthenticated);
  const [activeTab, setActiveTab] = useState<AccountTab>('going');
  const profileName = getDisplayName(profile);
  const locationLabel = profile?.location?.city ?? profile?.location?.country ?? 'Unset';

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

  if (!previewUsername) {
    return (
      <PageContainer>
        <PageHeading title="Account" />
        <StateNotice message="Set EXPO_PUBLIC_PREVIEW_USERNAME to load a real profile preview from the API." />
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
      <View style={styles.profileTopRow}>
        <ProfileAvatar imageUrl={profile?.profile_picture} label={profileName} size={96} />
        <View style={styles.profileStatsRow}>
          <ProfileStat label="Followers" value={String(profile?.followersCount ?? 0)} />
          <ProfileStat label="Interests" value={String(profile?.interests?.length ?? 0)} />
          <ProfileStat label="Role" value={profile?.userRole ?? 'User'} />
          <ProfileStat label="Location" value={locationLabel} />
        </View>
      </View>

      <View style={styles.profileTextBlock}>
        <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profileName}</Text>
        <Text style={[styles.profileHandle, { color: theme.colors.textSecondary }]}>
          @{profile?.username ?? previewUsername}
        </Text>
        <Text style={[styles.profileBio, { color: theme.colors.textPrimary }]}>
          {profile?.bio || 'No bio added yet.'}
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Profile')}
        style={({ pressed }) => [
          styles.editProfileButton,
          {
            borderColor: theme.colors.border,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Feather color={theme.colors.primary} name="edit-2" size={18} />
        <Text style={[styles.editProfileText, { color: theme.colors.primary }]}>Edit Profile</Text>
      </Pressable>

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
        <View style={styles.feedList}>
          {eventCollections[activeTab].map((event) => (
            <EventCard key={event.occurrenceId} occurrence={event} variant="feed" />
          ))}
        </View>
      ) : (
        <StateNotice message="This section will populate as you RSVP, host, and save more events." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  accountTabButton: {
    alignItems: 'center',
    borderBottomWidth: 3,
    flex: 1,
    justifyContent: 'center',
    minHeight: 72,
  },
  accountTabsRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
  },
  editProfileButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
  },
  editProfileText: {
    ...typography.bodyBold,
    fontSize: 17,
  },
  feedList: {
    gap: 24,
  },
  profileBio: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  profileHandle: {
    ...typography.bodyMedium,
    fontSize: 16,
  },
  profileName: {
    ...typography.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  profileStat: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  profileStatLabel: {
    ...typography.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  profileStatValue: {
    ...typography.displayBold,
    fontSize: 18,
  },
  profileStatsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  profileTextBlock: {
    gap: 4,
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
});
