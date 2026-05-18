import { useMutation, useLazyQuery } from '@apollo/client';
import { UpdateUserDocument } from '@data/graphql/mutation/User/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { MediaEntityType, MediaType } from '@data/graphql/types/graphql';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileEditorHero } from '@/components/account/edit-profile/ProfileEditorHero';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { useAccountProfile } from '@/hooks/account/useAccountProfile';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { buildEditProfileInput, createEditProfileForm, validateEditProfileForm } from '@/lib/account/forms';
import { getApolloAuthContext } from '@/lib/auth';
import { uploadImageAssetToSignedUrl, getImageAssetExtension } from '@/lib/media/upload';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';

export function EditProfileScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated, updateSessionIdentity, userId, username } = useAppShell();
  const { error, loading, profile, refetch } = useAccountProfile(username, authToken, isAuthenticated);
  const [updateUser, { loading: saving }] = useMutation(UpdateUserDocument);
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });
  const [form, setForm] = useState(() => createEditProfileForm(null));
  const [selectedAvatarAsset, setSelectedAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  const handleAvatarPress = async () => {
    if (!userId) {
      showToast({
        message: 'Your account session is missing profile identity. Please sign in again.',
        tone: 'error',
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library access is required to update your avatar.', tone: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSelectedAvatarAsset(asset);
    setAvatarPreviewUrl(asset.uri);
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm(createEditProfileForm(profile));
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !authToken || !userId) {
      return;
    }

    const validationMessage = validateEditProfileForm(form);
    if (validationMessage) {
      showToast({ message: validationMessage, tone: 'error' });
      return;
    }

    try {
      await withBlockingLoader('Saving your profile…', async () => {
        const selectedAvatarPreviewUrl = selectedAvatarAsset?.uri ?? null;
        let nextAvatarUrl: string | undefined;

        if (selectedAvatarAsset) {
          const ext = getImageAssetExtension(selectedAvatarAsset);
          const { data: urlData } = await getUploadUrl({
            variables: {
              entityId: userId,
              entityType: MediaEntityType.User,
              extension: ext,
              mediaType: MediaType.Avatar,
            },
          });

          if (!urlData?.getMediaUploadUrl) {
            throw new Error('Could not get avatar upload URL.');
          }

          const { uploadUrl, readUrl } = urlData.getMediaUploadUrl;
          await uploadImageAssetToSignedUrl(uploadUrl, selectedAvatarAsset);
          nextAvatarUrl = readUrl;
        }

        const response = await updateUser({
          variables: {
            input: {
              ...buildEditProfileInput(profile, form),
              profile_picture: nextAvatarUrl,
            },
          },
          ...getApolloAuthContext(authToken),
        });

        const updatedUser = response.data?.updateUser;
        if (!updatedUser) {
          throw new Error('We could not save your profile just now.');
        }

        updateSessionIdentity({
          email: updatedUser.email,
          username: updatedUser.username,
        });
        setForm(createEditProfileForm(updatedUser));
        setSelectedAvatarAsset(null);
        setAvatarPreviewUrl(selectedAvatarPreviewUrl ?? nextAvatarUrl ?? updatedUser.profile_picture ?? null);
        showToast({ message: 'Profile updated successfully.', tone: 'success' });
        void refetch();
      });
    } catch (mutationError) {
      showToast({
        message: mutationError instanceof Error ? mutationError.message : 'We could not save your profile just now.',
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
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
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.skeletonWrap}>
          <SkeletonBlock style={styles.heroSkeleton} />
          <SkeletonBlock style={styles.sectionSkeleton} />
          <SkeletonBlock style={styles.sectionSkeletonShort} />
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
          message="We couldn’t load your editable profile."
          onPressAction={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <ProfileEditorHero
        avatarUrlOverride={avatarPreviewUrl}
        onAvatarPress={() => void handleAvatarPress()}
        profile={profile}
      />

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
  buttonSkeleton: {
    borderRadius: 16,
    height: 52,
  },
  half: {
    flex: 1,
  },
  heroSkeleton: {
    borderRadius: 20,
    height: 152,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionSkeleton: {
    borderRadius: 20,
    height: 328,
  },
  sectionSkeletonShort: {
    borderRadius: 20,
    height: 214,
  },
  skeletonWrap: {
    gap: 20,
  },
});
