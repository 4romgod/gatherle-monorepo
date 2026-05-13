import { useMutation } from '@apollo/client';
import { UpdateUserDocument } from '@data/graphql/mutation/User/mutation';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileEditorHero } from '@/components/account/edit-profile/ProfileEditorHero';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AccountStatusBanner } from '@/components/account/shared/AccountStatusBanner';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { useAccountProfile } from '@/hooks/account/useAccountProfile';
import { buildEditProfileInput, createEditProfileForm, validateEditProfileForm } from '@/lib/account/forms';
import { getApolloAuthContext } from '@/lib/auth';

export function EditProfileScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated, updateSessionIdentity, username } = useAppShell();
  const { error, loading, profile, refetch } = useAccountProfile(username, authToken, isAuthenticated);
  const [updateUser, { loading: saving }] = useMutation(UpdateUserDocument);
  const [form, setForm] = useState(() => createEditProfileForm(null));
  const [status, setStatus] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm(createEditProfileForm(profile));
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !authToken) {
      return;
    }

    const validationMessage = validateEditProfileForm(form);
    if (validationMessage) {
      setStatus({ message: validationMessage, tone: 'error' });
      return;
    }

    try {
      const response = await updateUser({
        variables: {
          input: buildEditProfileInput(profile, form),
        },
        ...getApolloAuthContext(authToken),
      });

      const updatedUser = response.data?.updateUser;
      if (!updatedUser) {
        setStatus({ message: 'We could not save your profile just now.', tone: 'error' });
        return;
      }

      updateSessionIdentity({
        email: updatedUser.email,
        username: updatedUser.username,
      });
      setForm(createEditProfileForm(updatedUser));
      setStatus({ message: 'Profile updated successfully.', tone: 'success' });
      void refetch();
    } catch (mutationError) {
      setStatus({
        message: mutationError instanceof Error ? mutationError.message : 'We could not save your profile just now.',
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading subtitle="Sign in to edit your public identity." title="Edit profile" />
        <AuthPromptCard
          description="Your name, handle, bio, and location live here once you’re signed in."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Profile editing is for signed-in members"
        />
      </PageContainer>
    );
  }

  if (loading && !profile) {
    return (
      <PageContainer>
        <PageHeading subtitle="Shape how you appear across Gatherle." title="Edit profile" />
        <StateNotice message="Loading your editable profile..." />
      </PageContainer>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer>
        <PageHeading subtitle="Shape how you appear across Gatherle." title="Edit profile" />
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your editable profile."
          onPressAction={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ProfileEditorHero profile={profile} />
      {status ? <AccountStatusBanner message={status.message} tone={status.tone} /> : null}

      <AccountSectionCard
        description="These details follow you into event cards, messages, and your profile header."
        title="Public identity"
      >
        <AccountTextField
          autoCapitalize="words"
          autoComplete="name"
          label="First name"
          onChangeText={(givenName) => setForm((current) => ({ ...current, givenName }))}
          textContentType="givenName"
          value={form.givenName}
        />
        <AccountTextField
          autoCapitalize="words"
          autoComplete="name"
          label="Last name"
          onChangeText={(familyName) => setForm((current) => ({ ...current, familyName }))}
          textContentType="familyName"
          value={form.familyName}
        />
        <AccountTextField
          autoCapitalize="none"
          autoComplete="username"
          label="Username"
          onChangeText={(nextUsername) => setForm((current) => ({ ...current, username: nextUsername }))}
          placeholder="yourhandle"
          textContentType="username"
          value={form.username}
        />
        <AccountTextField
          label="Bio"
          multiline
          onChangeText={(bio) => setForm((current) => ({ ...current, bio }))}
          placeholder="Tell people what you’re into."
          value={form.bio}
        />
      </AccountSectionCard>

      <AccountSectionCard
        description="A light location signal helps Gatherle keep discovery relevant."
        title="Location"
      >
        <View style={styles.row}>
          <View style={styles.half}>
            <AccountTextField
              autoCapitalize="words"
              label="City"
              onChangeText={(city) => setForm((current) => ({ ...current, city }))}
              placeholder="Johannesburg"
              value={form.city}
            />
          </View>
          <View style={styles.half}>
            <AccountTextField
              autoCapitalize="words"
              label="State / region"
              onChangeText={(state) => setForm((current) => ({ ...current, state }))}
              placeholder="Gauteng"
              value={form.state}
            />
          </View>
        </View>
        <AccountTextField
          autoCapitalize="words"
          label="Country"
          onChangeText={(country) => setForm((current) => ({ ...current, country }))}
          placeholder="South Africa"
          value={form.country}
        />
      </AccountSectionCard>

      <AccountPrimaryButton icon="save" label="Save profile" loading={saving} onPress={() => void handleSave()} />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  half: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
