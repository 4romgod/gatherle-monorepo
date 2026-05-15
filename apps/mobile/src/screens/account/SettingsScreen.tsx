import { useMutation } from '@apollo/client';
import { FollowPolicy, Gender, SocialVisibility } from '@data/graphql/types/graphql';
import { UpdateUserDocument } from '@data/graphql/mutation/User/mutation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AccountStatusBanner } from '@/components/account/shared/AccountStatusBanner';
import { AccountSwitchRow } from '@/components/account/shared/AccountSwitchRow';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { useAccountProfile } from '@/hooks/account/useAccountProfile';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { buildSettingsInput, createSettingsForm, validateSettingsForm } from '@/lib/account/forms';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';

const VISIBILITY_OPTIONS = [SocialVisibility.Public, SocialVisibility.Followers, SocialVisibility.Private];
const GENDER_OPTIONS = [Gender.Male, Gender.Female, Gender.Other];

export function SettingsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated, signOut, updateSessionIdentity, username } = useAppShell();
  const { preference, setPreference, theme } = useAppTheme();
  const { error, loading, profile, refetch } = useAccountProfile(username, authToken, isAuthenticated);
  const [updateUser, { loading: saving }] = useMutation(UpdateUserDocument);
  const [status, setStatus] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const [form, setForm] = useState(() => createSettingsForm(null, preference));
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm(createSettingsForm(profile, preference));
  }, [profile]);

  useEffect(() => {
    setForm((current) => ({ ...current, themePreference: preference }));
  }, [preference]);

  const visibilityCopy = useMemo(
    () => ({
      [SocialVisibility.Followers]: 'Followers',
      [SocialVisibility.Private]: 'Only me',
      [SocialVisibility.Public]: 'Everyone',
    }),
    [],
  );

  const handleSave = async () => {
    if (!profile || !authToken) {
      return;
    }

    const validationMessage = validateSettingsForm(form);
    if (validationMessage) {
      setStatus({ message: validationMessage, tone: 'error' });
      return;
    }

    try {
      const response = await updateUser({
        variables: {
          input: buildSettingsInput(profile, form),
        },
        ...getApolloAuthContext(authToken),
      });

      const updatedUser = response.data?.updateUser;
      if (!updatedUser) {
        setStatus({ message: 'We could not save your settings just now.', tone: 'error' });
        return;
      }

      updateSessionIdentity({
        email: updatedUser.email,
        username: updatedUser.username,
      });
      setForm((current) => ({
        ...createSettingsForm(updatedUser, current.themePreference),
        themePreference: current.themePreference,
      }));
      setStatus({ message: 'Settings updated successfully.', tone: 'success' });
      void refetch();
    } catch (mutationError) {
      setStatus({
        message: mutationError instanceof Error ? mutationError.message : 'We could not save your settings just now.',
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <AuthPromptCard
          description="Settings become useful once we know who you are and can persist your preferences."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Settings need a signed-in account"
        />
      </PageContainer>
    );
  }

  if (loading && !profile) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.skeletonWrap}>
          <SkeletonBlock style={styles.sectionSkeletonMedium} />
          <SkeletonBlock style={styles.sectionSkeletonLarge} />
          <SkeletonBlock style={styles.sectionSkeletonLarge} />
          <SkeletonBlock style={styles.buttonSkeleton} />
        </View>
      </PageContainer>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer>
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your settings."
          onPressAction={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {status ? <AccountStatusBanner message={status.message} tone={status.tone} /> : null}

      <AccountSectionCard
        description="Account details stay close at hand, while profile presentation lives on the edit profile screen."
        title="Account"
      >
        <AccountTextField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email address"
          onChangeText={(email) => setForm((current) => ({ ...current, email }))}
          textContentType="emailAddress"
          value={form.email}
        />
        <AccountPrimaryButton
          icon="edit-2"
          label="Edit profile"
          onPress={() => navigation.navigate('Profile')}
          tone="secondary"
        />
      </AccountSectionCard>

      <AccountSectionCard description="Personal information and discovery-relevant details." title="Personal">
        <AccountTextField
          autoCapitalize="none"
          autoComplete="birthdate-full"
          label="Birthdate"
          onChangeText={(birthdate) => setForm((current) => ({ ...current, birthdate }))}
          placeholder="YYYY-MM-DD"
          textContentType="birthdate"
          value={form.birthdate}
        />
        <AccountTextField
          autoCapitalize="none"
          autoComplete="tel"
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={(phoneNumber) => setForm((current) => ({ ...current, phoneNumber }))}
          placeholder="+27 12 345 6789"
          textContentType="telephoneNumber"
          value={form.phoneNumber}
        />
        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Gender</Text>
          <View style={styles.choiceRow}>
            {GENDER_OPTIONS.map((gender) => (
              <AccountChoiceChip
                key={gender}
                label={gender}
                onPress={() => setForm((current) => ({ ...current, gender }))}
                selected={form.gender === gender}
              />
            ))}
          </View>
        </View>
      </AccountSectionCard>

      <AccountSectionCard description="Decide how visible your activity and graph should be." title="Privacy">
        <AccountSwitchRow
          description="Require your approval before someone can follow you."
          onValueChange={(value) =>
            setForm((current) => ({
              ...current,
              followPolicy: value ? FollowPolicy.RequireApproval : FollowPolicy.Public,
            }))
          }
          title="Private account"
          value={form.followPolicy === FollowPolicy.RequireApproval}
        />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Default activity visibility</Text>
          <View style={styles.choiceRow}>
            {VISIBILITY_OPTIONS.map((option) => (
              <AccountChoiceChip
                key={option}
                label={visibilityCopy[option]}
                onPress={() => setForm((current) => ({ ...current, defaultVisibility: option }))}
                selected={form.defaultVisibility === option}
              />
            ))}
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Followers list visibility</Text>
          <View style={styles.choiceRow}>
            {VISIBILITY_OPTIONS.map((option) => (
              <AccountChoiceChip
                key={`followers-${option}`}
                label={visibilityCopy[option]}
                onPress={() => setForm((current) => ({ ...current, followersListVisibility: option }))}
                selected={form.followersListVisibility === option}
              />
            ))}
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Following list visibility</Text>
          <View style={styles.choiceRow}>
            {VISIBILITY_OPTIONS.map((option) => (
              <AccountChoiceChip
                key={`following-${option}`}
                label={visibilityCopy[option]}
                onPress={() => setForm((current) => ({ ...current, followingListVisibility: option }))}
                selected={form.followingListVisibility === option}
              />
            ))}
          </View>
        </View>

        <AccountSwitchRow
          description="Keep your RSVP activity public by default."
          onValueChange={(shareRsvpByDefault) => setForm((current) => ({ ...current, shareRsvpByDefault }))}
          title="Share RSVPs by default"
          value={form.shareRsvpByDefault}
        />
        <AccountSwitchRow
          description="Share event check-ins automatically when you attend."
          onValueChange={(shareCheckinsByDefault) => setForm((current) => ({ ...current, shareCheckinsByDefault }))}
          title="Share check-ins by default"
          value={form.shareCheckinsByDefault}
        />
      </AccountSectionCard>

      <AccountSectionCard description="How Gatherle should reach you when something matters." title="Communication">
        <AccountSwitchRow
          description="Receive email updates for invites, reminders, and important account changes."
          onValueChange={(communicationEmailEnabled) =>
            setForm((current) => ({ ...current, communicationEmailEnabled }))
          }
          title="Email updates"
          value={form.communicationEmailEnabled}
        />
        <AccountSwitchRow
          description="Prepare for future native push alerts on your device."
          onValueChange={(communicationPushEnabled) => setForm((current) => ({ ...current, communicationPushEnabled }))}
          title="Push notifications"
          value={form.communicationPushEnabled}
        />
      </AccountSectionCard>

      <AccountSectionCard description="Match the app to your preference right now." title="Appearance">
        <View style={styles.choiceRow}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <AccountChoiceChip
              key={mode}
              label={mode[0].toUpperCase() + mode.slice(1)}
              onPress={() => {
                setPreference(mode);
                setForm((current) => ({ ...current, themePreference: mode }));
              }}
              selected={form.themePreference === mode}
            />
          ))}
        </View>
      </AccountSectionCard>

      <AccountSectionCard description="Keep access to your mobile session under control." title="Session">
        <AccountPrimaryButton
          icon="log-out"
          label="Sign out"
          onPress={() => {
            signOut();
            navigation.navigate('MainTabs', { screen: 'Home' });
          }}
          tone="danger"
        />
      </AccountSectionCard>

      <AccountPrimaryButton icon="save" label="Save settings" loading={saving} onPress={() => void handleSave()} />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  buttonSkeleton: {
    borderRadius: 16,
    height: 52,
  },
  choiceBlock: {
    gap: 10,
  },
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionSkeletonLarge: {
    borderRadius: 20,
    height: 286,
  },
  sectionSkeletonMedium: {
    borderRadius: 20,
    height: 170,
  },
  skeletonWrap: {
    gap: 20,
  },
});
