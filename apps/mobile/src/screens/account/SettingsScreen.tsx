import { Feather } from '@expo/vector-icons';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { DeleteUserByIdDocument, LoginUserDocument, UpdateUserDocument } from '@data/graphql/mutation/User/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import {
  ClearAllSessionStatesDocument,
  FollowPolicy,
  Gender,
  GetEventCategoryGroupsDocument,
  MediaEntityType,
  MediaType,
  SocialVisibility,
  type GetEventCategoryGroupsQuery,
} from '@data/graphql/types/graphql';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList, SettingsTabKey } from '@/app/navigation/routes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { ProfileEditorHero } from '@/components/account/edit-profile/ProfileEditorHero';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AccountSwitchRow } from '@/components/account/shared/AccountSwitchRow';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { DatePickerField } from '@/components/core/DatePickerField';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { useAccountProfile } from '@/hooks/account/useAccountProfile';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import {
  buildEditProfileInput,
  buildSettingsInput,
  createEditProfileForm,
  createSettingsForm,
  validateEditProfileForm,
  validateSettingsForm,
} from '@/lib/account/forms';
import { resetPasswordSchema } from '@/lib/auth/validation';
import { getApolloAuthContext } from '@/lib/auth';
import { featureFlags } from '@/lib/featureFlags';
import { MOBILE_MEDIA_PICKER_ASPECTS } from '@/lib/media/constants';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';

const VISIBILITY_OPTIONS = [SocialVisibility.Public, SocialVisibility.Followers, SocialVisibility.Private];
const GENDER_OPTIONS = [Gender.Male, Gender.Female, Gender.Other];

type SettingsRoute = RouteProp<RootStackParamList, 'Settings'>;

type PasswordForm = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

type PasswordStrength = {
  feedback: string[];
  score: number;
  tone: 'error' | 'primary' | 'success' | 'warning';
};

type InterestLike = {
  eventCategoryId?: string | null;
} | null;

const EMPTY_PASSWORD_FORM: PasswordForm = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
};

function normalizeIdList(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function extractInterestIds(interests: readonly InterestLike[] | null | undefined) {
  return normalizeIdList(
    (interests ?? [])
      .map((interest) => interest?.eventCategoryId)
      .filter((interestId): interestId is string => Boolean(interestId)),
  );
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, feedback: [], tone: 'error' };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 25;
  else feedback.push('Use at least 8 characters.');

  if (password.length >= 12) score += 10;

  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Add a lowercase letter.');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Add an uppercase letter.');

  if (/\d/.test(password)) score += 15;
  else feedback.push('Add a number.');

  if (/[^a-zA-Z0-9]/.test(password)) score += 20;
  else feedback.push('Add a special character.');

  const commonPatterns = [/123/i, /abc/i, /password/i, /qwerty/i, /admin/i, /(\w)\1{2,}/i];
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    feedback.push('Avoid common patterns.');
  } else {
    score += 10;
  }

  if (score >= 80) {
    return { score: Math.min(100, score), feedback, tone: 'success' };
  }

  if (score >= 60) {
    return { score: Math.min(100, score), feedback, tone: 'primary' };
  }

  if (score >= 40) {
    return { score: Math.min(100, score), feedback, tone: 'warning' };
  }

  return { score: Math.min(100, score), feedback, tone: 'error' };
}

export function SettingsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<SettingsRoute>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated, setPendingVerificationEmail, signOut, updateSessionIdentity, userId, username } =
    useAppShell();
  const { preference, setPreference, theme } = useAppTheme();
  const { error, loading, profile, refetch } = useAccountProfile(username, authToken, isAuthenticated);
  const [updateUser, { loading: saving }] = useMutation(UpdateUserDocument);
  const [verifyPassword] = useMutation(LoginUserDocument);
  const [deleteUserById, { loading: deletingAccount }] = useMutation(DeleteUserByIdDocument);
  const [clearAllSessionStates, { loading: clearingSessionStates }] = useMutation(ClearAllSessionStatesDocument);
  const {
    data: categoryGroupsData,
    error: categoryGroupsError,
    loading: categoryGroupsLoading,
    refetch: refetchCategoryGroups,
  } = useQuery(GetEventCategoryGroupsDocument, {
    fetchPolicy: 'cache-first',
    skip: !isAuthenticated,
  });
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });
  const [profileForm, setProfileForm] = useState(() => createEditProfileForm(null));
  const [settingsForm, setSettingsForm] = useState(() => createSettingsForm(null, preference));
  const [selectedAvatarAsset, setSelectedAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [savingInterests, setSavingInterests] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileForm(createEditProfileForm(profile));
    setSettingsForm(createSettingsForm(profile, preference));
  }, [profile]);

  useEffect(() => {
    if (!profile || selectedAvatarAsset) {
      return;
    }

    setAvatarPreviewUrl(profile.profile_picture ?? null);
  }, [profile, selectedAvatarAsset]);

  useEffect(() => {
    setSettingsForm((current) => ({ ...current, themePreference: preference }));
  }, [preference]);

  useEffect(() => {
    setSelectedInterestIds(extractInterestIds(profile?.interests));
  }, [profile?.interests]);

  const visibilityCopy = useMemo(
    () => ({
      [SocialVisibility.Followers]: 'Followers',
      [SocialVisibility.Private]: 'Only me',
      [SocialVisibility.Public]: 'Everyone',
    }),
    [],
  );
  const interestGroups = useMemo<GetEventCategoryGroupsQuery['readEventCategoryGroups']>(
    () => (categoryGroupsData?.readEventCategoryGroups ?? []).filter((group) => Boolean(group.eventCategories?.length)),
    [categoryGroupsData?.readEventCategoryGroups],
  );
  const currentInterestIds = useMemo(() => extractInterestIds(profile?.interests), [profile?.interests]);
  const selectedInterestSet = useMemo(() => new Set(selectedInterestIds), [selectedInterestIds]);
  const hasInterestChanges = useMemo(() => {
    const currentIds = normalizeIdList(currentInterestIds);
    const nextIds = normalizeIdList(selectedInterestIds);
    return currentIds.length !== nextIds.length || currentIds.some((value, index) => value !== nextIds[index]);
  }, [currentInterestIds, selectedInterestIds]);
  const interestLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    for (const interest of profile?.interests ?? []) {
      if (interest?.eventCategoryId && interest.name) {
        lookup.set(interest.eventCategoryId, interest.name);
      }
    }

    for (const group of interestGroups) {
      for (const category of group.eventCategories ?? []) {
        if (category?.eventCategoryId && category.name) {
          lookup.set(category.eventCategoryId, category.name);
        }
      }
    }

    return lookup;
  }, [interestGroups, profile?.interests]);
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword],
  );
  const passwordStrengthColor = useMemo(() => {
    switch (passwordStrength.tone) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'primary':
        return theme.colors.primary;
      default:
        return theme.colors.error;
    }
  }, [passwordStrength.tone, theme.colors.error, theme.colors.primary, theme.colors.success, theme.colors.warning]);
  const requiresCurrentPassword = profile?.hasLocalPassword !== false;
  const isSetPasswordMode = !requiresCurrentPassword;

  const resolvedInitialTab = route.params?.initialTab ?? 'account';

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
      aspect: MOBILE_MEDIA_PICKER_ASPECTS.avatar,
      mediaTypes: 'images',
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setSelectedAvatarAsset(asset);
    setAvatarPreviewUrl(asset.uri);
  };

  const handleSaveProfile = async () => {
    if (!profile || !authToken || !userId) {
      return;
    }

    const validationMessage = validateEditProfileForm(profileForm);
    if (validationMessage) {
      showToast({ message: validationMessage, tone: 'error' });
      return;
    }

    try {
      await withBlockingLoader('Saving your profile…', async () => {
        const selectedAvatarPreview = selectedAvatarAsset?.uri ?? null;
        let nextAvatarUrl: string | undefined;

        if (selectedAvatarAsset) {
          const extension = getImageAssetExtension(selectedAvatarAsset);
          const { data: urlData } = await getUploadUrl({
            variables: {
              entityId: userId,
              entityType: MediaEntityType.User,
              extension,
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
              ...buildEditProfileInput(profile, profileForm),
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
        setProfileForm(createEditProfileForm(updatedUser));
        setSelectedAvatarAsset(null);
        setAvatarPreviewUrl(selectedAvatarPreview ?? nextAvatarUrl ?? updatedUser.profile_picture ?? null);
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

  const handleSaveSettings = async () => {
    if (!profile || !authToken) {
      return;
    }

    const validationMessage = validateSettingsForm(settingsForm);
    if (validationMessage) {
      showToast({ message: validationMessage, tone: 'error' });
      return;
    }

    const normalizedCurrentEmail = profile.email.trim().toLowerCase();
    const normalizedNextEmail = settingsForm.email.trim().toLowerCase();
    const emailChanged = normalizedCurrentEmail !== normalizedNextEmail;

    try {
      await withBlockingLoader('Saving your settings…', async () => {
        const response = await updateUser({
          variables: {
            input: buildSettingsInput(profile, settingsForm),
          },
          ...getApolloAuthContext(authToken),
        });

        const updatedUser = response.data?.updateUser;
        if (!updatedUser) {
          throw new Error('We could not save your settings just now.');
        }

        updateSessionIdentity({
          email: updatedUser.email,
          username: updatedUser.username,
        });
        if (emailChanged) {
          setPendingVerificationEmail(updatedUser.email);
        }
        setSettingsForm((current) => ({
          ...createSettingsForm(updatedUser, current.themePreference),
          themePreference: current.themePreference,
        }));
        showToast({
          message: emailChanged ? 'Settings updated. Verify your new email address.' : 'Settings updated successfully.',
          tone: 'success',
        });
        void refetch();

        if (emailChanged) {
          navigation.navigate('VerifyPending', { email: updatedUser.email });
        }
      });
    } catch (mutationError) {
      showToast({
        message: mutationError instanceof Error ? mutationError.message : 'We could not save your settings just now.',
        tone: 'error',
      });
    }
  };

  const renderSettingsSaveButton = (label = 'Save settings') => (
    <AccountPrimaryButton icon="save" label={label} loading={saving} onPress={() => void handleSaveSettings()} />
  );

  const handleToggleInterest = useCallback((eventCategoryId: string) => {
    setSelectedInterestIds((current) =>
      current.includes(eventCategoryId)
        ? current.filter((currentId) => currentId !== eventCategoryId)
        : normalizeIdList([...current, eventCategoryId]),
    );
  }, []);

  const handleSaveInterests = useCallback(async () => {
    if (!profile || !authToken) {
      return;
    }

    if (!hasInterestChanges) {
      showToast({ message: 'Your interests are already up to date.', tone: 'success' });
      return;
    }

    setSavingInterests(true);

    try {
      await withBlockingLoader('Saving your interests…', async () => {
        const response = await updateUser({
          variables: {
            input: {
              interests: normalizeIdList(selectedInterestIds),
              userId: profile.userId,
            },
          },
          ...getApolloAuthContext(authToken),
        });

        const updatedUser = response.data?.updateUser;
        if (!updatedUser) {
          throw new Error('We could not save your interests just now.');
        }

        setSelectedInterestIds(extractInterestIds(updatedUser.interests));
        showToast({ message: 'Interests updated successfully.', tone: 'success' });
        void refetch();
      });
    } catch (mutationError) {
      showToast({
        message: mutationError instanceof Error ? mutationError.message : 'We could not save your interests just now.',
        tone: 'error',
      });
    } finally {
      setSavingInterests(false);
    }
  }, [authToken, hasInterestChanges, profile, refetch, selectedInterestIds, showToast, updateUser, withBlockingLoader]);

  const handleSavePassword = useCallback(async () => {
    if (!profile?.email || !authToken || !userId) {
      return;
    }

    if (requiresCurrentPassword && !passwordForm.currentPassword.trim()) {
      showToast({ message: 'Current password is required.', tone: 'error' });
      return;
    }

    if (requiresCurrentPassword && passwordForm.currentPassword === passwordForm.newPassword) {
      showToast({ message: 'New password must be different from your current password.', tone: 'error' });
      return;
    }

    const validation = resetPasswordSchema.safeParse({
      confirmPassword: passwordForm.confirmPassword,
      password: passwordForm.newPassword,
    });

    if (!validation.success) {
      showToast({ message: validation.error.issues[0]?.message ?? 'Enter a valid new password.', tone: 'error' });
      return;
    }

    setChangingPassword(true);

    try {
      await withBlockingLoader(isSetPasswordMode ? 'Setting your password…' : 'Updating your password…', async () => {
        if (requiresCurrentPassword) {
          try {
            await verifyPassword({
              variables: {
                input: {
                  email: profile.email,
                  password: passwordForm.currentPassword,
                },
              },
            });
          } catch {
            throw new Error('Current password is incorrect.');
          }
        }

        const response = await updateUser({
          variables: {
            input: {
              password: passwordForm.newPassword,
              userId,
            },
          },
          ...getApolloAuthContext(authToken),
        });

        if (!response.data?.updateUser) {
          throw new Error('We could not update your password just now.');
        }

        setPasswordForm(EMPTY_PASSWORD_FORM);
        showToast({
          message: isSetPasswordMode ? 'Password set successfully.' : 'Password changed successfully.',
          tone: 'success',
        });
        void refetch();
      });
    } catch (mutationError) {
      showToast({
        message: mutationError instanceof Error ? mutationError.message : 'We could not update your password just now.',
        tone: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  }, [
    authToken,
    isSetPasswordMode,
    passwordForm,
    profile?.email,
    refetch,
    requiresCurrentPassword,
    showToast,
    updateUser,
    userId,
    verifyPassword,
    withBlockingLoader,
  ]);

  const handleClearSessionStateConfirmed = useCallback(async () => {
    if (!authToken) {
      return;
    }

    try {
      await withBlockingLoader('Resetting session data…', async () => {
        const response = await clearAllSessionStates({
          ...getApolloAuthContext(authToken),
        });

        if (!response.data?.clearAllSessionStates) {
          throw new Error('We could not reset your session data just now.');
        }

        showToast({
          message: 'Session data cleared. Saved filters and drafts will reset on next load.',
          tone: 'success',
        });
      });
    } catch (mutationError) {
      showToast({
        message:
          mutationError instanceof Error ? mutationError.message : 'We could not reset your session data just now.',
        tone: 'error',
      });
    }
  }, [authToken, clearAllSessionStates, showToast, withBlockingLoader]);

  const handleClearSessionStatePress = useCallback(() => {
    Alert.alert(
      'Reset session data?',
      'This clears your saved filters, tab selections, and drafts. Your account, messages, and events stay safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset session',
          style: 'destructive',
          onPress: () => {
            void handleClearSessionStateConfirmed();
          },
        },
      ],
    );
  }, [handleClearSessionStateConfirmed]);

  const handleDeleteAccountConfirmed = useCallback(async () => {
    if (!authToken || !userId) {
      showToast({
        message: 'Your session is missing account identity. Please sign in again before deleting your account.',
        tone: 'error',
      });
      return;
    }

    try {
      await withBlockingLoader('Deleting your account…', async () => {
        const response = await deleteUserById({
          variables: { userId },
          ...getApolloAuthContext(authToken),
        });

        if (!response.data?.deleteUserById) {
          throw new Error('We could not delete your account just now.');
        }

        signOut();
        showToast({ message: 'Account deleted successfully.', tone: 'success' });
      });
    } catch (mutationError) {
      showToast({
        message: mutationError instanceof Error ? mutationError.message : 'We could not delete your account just now.',
        tone: 'error',
      });
    }
  }, [authToken, deleteUserById, showToast, signOut, userId, withBlockingLoader]);

  const handleDeleteAccountPress = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your account, hosted content, purchases, and associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccountConfirmed();
          },
        },
      ],
    );
  }, [handleDeleteAccountConfirmed]);

  const settingsRoutes = useMemo(() => {
    const routes: Array<{
      key: SettingsTabKey;
      label: string;
      render: () => ReactNode;
    }> = [
      {
        key: 'profile',
        label: 'Profile',
        render: () => (
          <View style={styles.tabPane}>
            <ProfileEditorHero
              avatarUrlOverride={avatarPreviewUrl}
              onAvatarPress={() => void handleAvatarPress()}
              profile={profile!}
            />

            <AccountSectionCard
              description="These details follow you into event cards, messages, and your profile header."
              title="Public identity"
            >
              <AccountTextField
                autoCapitalize="words"
                autoComplete="name"
                label="First name"
                onChangeText={(givenName) => setProfileForm((current) => ({ ...current, givenName }))}
                textContentType="givenName"
                value={profileForm.givenName}
              />
              <AccountTextField
                autoCapitalize="words"
                autoComplete="name"
                label="Last name"
                onChangeText={(familyName) => setProfileForm((current) => ({ ...current, familyName }))}
                textContentType="familyName"
                value={profileForm.familyName}
              />
              <AccountTextField
                autoCapitalize="none"
                autoComplete="username"
                label="Username"
                onChangeText={(nextUsername) => setProfileForm((current) => ({ ...current, username: nextUsername }))}
                placeholder="yourhandle"
                textContentType="username"
                value={profileForm.username}
              />
              <AccountTextField
                label="Bio"
                multiline
                onChangeText={(bio) => setProfileForm((current) => ({ ...current, bio }))}
                placeholder="Tell people what you’re into."
                value={profileForm.bio}
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
                    onChangeText={(city) => setProfileForm((current) => ({ ...current, city }))}
                    placeholder="Johannesburg"
                    value={profileForm.city}
                  />
                </View>
                <View style={styles.half}>
                  <AccountTextField
                    autoCapitalize="words"
                    label="State / region"
                    onChangeText={(state) => setProfileForm((current) => ({ ...current, state }))}
                    placeholder="Gauteng"
                    value={profileForm.state}
                  />
                </View>
              </View>
              <AccountTextField
                autoCapitalize="words"
                label="Country"
                onChangeText={(country) => setProfileForm((current) => ({ ...current, country }))}
                placeholder="South Africa"
                value={profileForm.country}
              />
            </AccountSectionCard>

            <AccountPrimaryButton
              icon="save"
              label="Save profile"
              loading={saving}
              onPress={() => void handleSaveProfile()}
            />
          </View>
        ),
      },
      {
        key: 'account',
        label: 'Account',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description="Account details stay close at hand. Changing your email will require reverification."
              title="Account"
            >
              <AccountTextField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email address"
                onChangeText={(email) => setSettingsForm((current) => ({ ...current, email }))}
                textContentType="emailAddress"
                value={settingsForm.email}
              />
            </AccountSectionCard>
            {renderSettingsSaveButton()}
            <View
              style={[
                styles.dangerCard,
                {
                  backgroundColor: theme.dark ? 'rgba(249, 112, 102, 0.08)' : '#fff6f5',
                  borderColor: theme.dark ? 'rgba(249, 112, 102, 0.34)' : 'rgba(240, 68, 56, 0.22)',
                },
              ]}
            >
              <View style={styles.dangerHeader}>
                <View
                  style={[
                    styles.dangerIconWrap,
                    {
                      backgroundColor: theme.dark ? 'rgba(249, 112, 102, 0.14)' : 'rgba(240, 68, 56, 0.08)',
                    },
                  ]}
                >
                  <Feather color={theme.colors.error} name="alert-triangle" size={18} />
                </View>
                <View style={styles.dangerCopy}>
                  <Text style={[styles.dangerEyebrow, { color: theme.colors.error }]}>Danger zone</Text>
                  <Text style={[styles.dangerTitle, { color: theme.colors.textPrimary }]}>Delete account</Text>
                  <Text style={[styles.dangerDescription, { color: theme.colors.textSecondary }]}>
                    Permanently remove your account and associated data. This action cannot be undone.
                  </Text>
                </View>
              </View>
              <AccountPrimaryButton
                icon="trash-2"
                label="Delete my account"
                loading={deletingAccount}
                loadingLabel="Deleting..."
                onPress={handleDeleteAccountPress}
                tone="danger"
              />
            </View>
          </View>
        ),
      },
      {
        key: 'personal',
        label: 'Personal',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard description="Personal information and discovery-relevant details." title="Personal">
              <DatePickerField
                allowClear
                helperText="Stored as YYYY-MM-DD."
                label="Birthdate"
                maximumDate={new Date()}
                onChangeDate={(birthdate) => setSettingsForm((current) => ({ ...current, birthdate }))}
                placeholder="Select birthdate"
                value={settingsForm.birthdate}
              />
              <AccountTextField
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                label="Phone number"
                onChangeText={(phoneNumber) => setSettingsForm((current) => ({ ...current, phoneNumber }))}
                placeholder="+27 12 345 6789"
                textContentType="telephoneNumber"
                value={settingsForm.phoneNumber}
              />
              <View style={styles.choiceBlock}>
                <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Gender</Text>
                <View style={styles.choiceRow}>
                  {GENDER_OPTIONS.map((gender) => (
                    <AccountChoiceChip
                      key={gender}
                      label={gender}
                      onPress={() => setSettingsForm((current) => ({ ...current, gender }))}
                      selected={settingsForm.gender === gender}
                    />
                  ))}
                </View>
              </View>
            </AccountSectionCard>
            {renderSettingsSaveButton()}
          </View>
        ),
      },
    ];

    if (featureFlags.enablePrivateUsers) {
      routes.push({
        key: 'privacy',
        label: 'Privacy',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard description="Decide how visible your activity and graph should be." title="Privacy">
              <AccountSwitchRow
                description="Require your approval before someone can follow you."
                onValueChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    followPolicy: value ? FollowPolicy.RequireApproval : FollowPolicy.Public,
                  }))
                }
                title="Private account"
                value={settingsForm.followPolicy === FollowPolicy.RequireApproval}
              />

              <View style={styles.choiceBlock}>
                <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>
                  Default activity visibility
                </Text>
                <View style={styles.choiceRow}>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <AccountChoiceChip
                      key={option}
                      label={visibilityCopy[option]}
                      onPress={() => setSettingsForm((current) => ({ ...current, defaultVisibility: option }))}
                      selected={settingsForm.defaultVisibility === option}
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
                      onPress={() => setSettingsForm((current) => ({ ...current, followersListVisibility: option }))}
                      selected={settingsForm.followersListVisibility === option}
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
                      onPress={() => setSettingsForm((current) => ({ ...current, followingListVisibility: option }))}
                      selected={settingsForm.followingListVisibility === option}
                    />
                  ))}
                </View>
              </View>
            </AccountSectionCard>
            {renderSettingsSaveButton()}
          </View>
        ),
      });
    }

    routes.push(
      {
        key: 'activity',
        label: 'Activity',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description="Decide which activity defaults should apply to your account."
              title="Activity"
            >
              <AccountSwitchRow
                description="Keep your RSVP activity public by default."
                onValueChange={(shareRsvpByDefault) =>
                  setSettingsForm((current) => ({ ...current, shareRsvpByDefault }))
                }
                title="Share RSVPs by default"
                value={settingsForm.shareRsvpByDefault}
              />
              <AccountSwitchRow
                description="Share event check-ins automatically when you attend."
                onValueChange={(shareCheckinsByDefault) =>
                  setSettingsForm((current) => ({ ...current, shareCheckinsByDefault }))
                }
                title="Share check-ins by default"
                value={settingsForm.shareCheckinsByDefault}
              />
            </AccountSectionCard>
            {renderSettingsSaveButton()}
          </View>
        ),
      },
      {
        key: 'alerts',
        label: 'Alerts',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description="How Gatherle should reach you when something matters."
              title="Communication"
            >
              <AccountSwitchRow
                description="Receive email updates for invites, reminders, and important account changes."
                onValueChange={(communicationEmailEnabled) =>
                  setSettingsForm((current) => ({ ...current, communicationEmailEnabled }))
                }
                title="Email updates"
                value={settingsForm.communicationEmailEnabled}
              />
              <AccountSwitchRow
                description="Prepare for future native push alerts on your device."
                onValueChange={(communicationPushEnabled) =>
                  setSettingsForm((current) => ({ ...current, communicationPushEnabled }))
                }
                title="Push notifications"
                value={settingsForm.communicationPushEnabled}
              />
            </AccountSectionCard>
            {renderSettingsSaveButton()}
          </View>
        ),
      },
      {
        key: 'appearance',
        label: 'Theme',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard description="Match the app to your preference right now." title="Appearance">
              <View style={styles.choiceRow}>
                {(['system', 'light', 'dark'] as const).map((mode) => (
                  <AccountChoiceChip
                    key={mode}
                    label={mode[0].toUpperCase() + mode.slice(1)}
                    onPress={() => {
                      setPreference(mode);
                      setSettingsForm((current) => ({ ...current, themePreference: mode }));
                    }}
                    selected={settingsForm.themePreference === mode}
                  />
                ))}
              </View>
            </AccountSectionCard>
            {renderSettingsSaveButton('Save theme')}
          </View>
        ),
      },
      {
        key: 'interests',
        label: 'Interests',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description="Select interests to keep your recommendations and local discovery relevant."
              title={`Your interests (${selectedInterestIds.length})`}
            >
              {selectedInterestIds.length ? (
                <View style={styles.choiceRow}>
                  {selectedInterestIds.map((interestId) => (
                    <AccountChoiceChip
                      key={`selected-${interestId}`}
                      label={interestLookup.get(interestId) ?? 'Interest'}
                      onPress={() => handleToggleInterest(interestId)}
                      selected
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                  No interests selected yet. Pick a few below to personalize your event feed.
                </Text>
              )}
            </AccountSectionCard>

            <AccountSectionCard
              description="Tap any category to add or remove it from your profile."
              title="Browse categories"
            >
              {categoryGroupsLoading && !interestGroups.length ? (
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Loading categories…</Text>
              ) : categoryGroupsError ? (
                <StateNotice
                  actionLabel="Retry"
                  message="We couldn’t load your interest categories."
                  onPressAction={() => void refetchCategoryGroups()}
                />
              ) : (
                <View style={styles.interestGroups}>
                  {interestGroups.map((group) => (
                    <View key={group.eventCategoryGroupId} style={styles.interestGroup}>
                      <Text style={[styles.interestGroupTitle, { color: theme.colors.textPrimary }]}>{group.name}</Text>
                      <View style={styles.choiceRow}>
                        {(group.eventCategories ?? []).map((category) =>
                          category?.eventCategoryId ? (
                            <AccountChoiceChip
                              key={category.eventCategoryId}
                              label={category.name}
                              onPress={() => handleToggleInterest(category.eventCategoryId)}
                              selected={selectedInterestSet.has(category.eventCategoryId)}
                            />
                          ) : null,
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </AccountSectionCard>
            <AccountPrimaryButton
              icon="save"
              label={hasInterestChanges ? 'Save interests' : 'Interests up to date'}
              loading={savingInterests}
              onPress={() => void handleSaveInterests()}
              tone={hasInterestChanges ? 'primary' : 'secondary'}
            />
          </View>
        ),
      },
      {
        key: 'password',
        label: 'Password',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description={
                isSetPasswordMode
                  ? 'Add a password so you can sign in with email alongside your social login.'
                  : 'Update your password to keep your account secure across devices.'
              }
              title={isSetPasswordMode ? 'Set password' : 'Password'}
            >
              {requiresCurrentPassword ? (
                <AccountTextField
                  autoCapitalize="none"
                  autoComplete="password"
                  label="Current password"
                  onChangeText={(currentPassword) => setPasswordForm((current) => ({ ...current, currentPassword }))}
                  onPressTrailingAction={() => setShowCurrentPassword((current) => !current)}
                  secureTextEntry={!showCurrentPassword}
                  textContentType="password"
                  trailingActionIcon={showCurrentPassword ? 'eye-off' : 'eye'}
                  trailingActionLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  value={passwordForm.currentPassword}
                />
              ) : null}
              <AccountTextField
                autoCapitalize="none"
                autoComplete="new-password"
                label={isSetPasswordMode ? 'Password' : 'New password'}
                onChangeText={(newPassword) => setPasswordForm((current) => ({ ...current, newPassword }))}
                onPressTrailingAction={() => setShowNewPassword((current) => !current)}
                secureTextEntry={!showNewPassword}
                textContentType="newPassword"
                trailingActionIcon={showNewPassword ? 'eye-off' : 'eye'}
                trailingActionLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                value={passwordForm.newPassword}
              />

              {passwordForm.newPassword ? (
                <View
                  style={[
                    styles.passwordStrengthCard,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.passwordStrengthHeader}>
                    <Text style={[styles.passwordStrengthLabel, { color: theme.colors.textPrimary }]}>
                      Password strength
                    </Text>
                    <Text style={[styles.passwordStrengthScore, { color: passwordStrengthColor }]}>
                      {passwordStrength.score >= 80
                        ? 'Strong'
                        : passwordStrength.score >= 60
                          ? 'Good'
                          : passwordStrength.score >= 40
                            ? 'Okay'
                            : 'Weak'}
                    </Text>
                  </View>
                  <View style={[styles.passwordTrack, { backgroundColor: theme.dark ? '#22304a' : '#e5e7eb' }]}>
                    <View
                      style={[
                        styles.passwordTrackFill,
                        {
                          backgroundColor: passwordStrengthColor,
                          width: `${passwordStrength.score}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.passwordStrengthHint, { color: theme.colors.textSecondary }]}>
                    {passwordStrength.feedback.length
                      ? passwordStrength.feedback.slice(0, 2).join(' ')
                      : 'This password covers the basics well.'}
                  </Text>
                </View>
              ) : null}

              <AccountTextField
                autoCapitalize="none"
                autoComplete="new-password"
                label={isSetPasswordMode ? 'Confirm password' : 'Confirm new password'}
                onChangeText={(confirmPassword) => setPasswordForm((current) => ({ ...current, confirmPassword }))}
                onPressTrailingAction={() => setShowConfirmPassword((current) => !current)}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                trailingActionIcon={showConfirmPassword ? 'eye-off' : 'eye'}
                trailingActionLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                value={passwordForm.confirmPassword}
              />
            </AccountSectionCard>
            <AccountPrimaryButton
              icon="lock"
              label={isSetPasswordMode ? 'Set password' : 'Save password'}
              loading={changingPassword}
              loadingLabel={isSetPasswordMode ? 'Setting...' : 'Saving...'}
              onPress={() => void handleSavePassword()}
            />
          </View>
        ),
      },
      {
        key: 'session',
        label: 'Session',
        render: () => (
          <View style={styles.tabPane}>
            <AccountSectionCard
              description="Reset saved UI state if tabs, filters, or drafts ever get stuck."
              title="Session state"
            >
              <View
                style={[
                  styles.infoPanel,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.infoPanelTitle, { color: theme.colors.textPrimary }]}>What gets cleared</Text>
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                  Saved filters, tab selections, and draft state synced to your account.
                </Text>
              </View>
              <View
                style={[
                  styles.infoPanel,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.infoPanelTitle, { color: theme.colors.textPrimary }]}>What stays safe</Text>
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                  Your profile, messages, follows, and events are not affected.
                </Text>
              </View>
            </AccountSectionCard>
            <AccountPrimaryButton
              icon="refresh-ccw"
              label="Reset session data"
              loading={clearingSessionStates}
              loadingLabel="Resetting..."
              onPress={handleClearSessionStatePress}
              tone="secondary"
            />
          </View>
        ),
      },
    );

    return routes;
  }, [
    avatarPreviewUrl,
    categoryGroupsError,
    categoryGroupsLoading,
    changingPassword,
    clearingSessionStates,
    currentInterestIds,
    handleClearSessionStatePress,
    handleSaveInterests,
    handleSavePassword,
    handleToggleInterest,
    handleSaveProfile,
    hasInterestChanges,
    interestGroups,
    interestLookup,
    passwordForm.confirmPassword,
    passwordForm.currentPassword,
    passwordForm.newPassword,
    passwordStrength.score,
    passwordStrength.feedback,
    passwordStrengthColor,
    preference,
    profile,
    profileForm,
    refetchCategoryGroups,
    renderSettingsSaveButton,
    savingInterests,
    selectedInterestIds,
    selectedInterestSet,
    setPreference,
    settingsForm,
    showConfirmPassword,
    showCurrentPassword,
    showNewPassword,
    deletingAccount,
    handleDeleteAccountPress,
    theme.colors.textPrimary,
    theme.colors.textSecondary,
    theme.colors.error,
    theme.colors.border,
    theme.colors.surfaceMuted,
    theme.dark,
    visibilityCopy,
  ]);

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
          <SkeletonBlock style={styles.tabsSkeleton} />
          <SkeletonBlock style={styles.sectionSkeletonMedium} />
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
      <SwipePagerTabs initialKey={resolvedInitialTab} routes={settingsRoutes} scrollableTabs variant="label" />
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
  dangerCard: {
    borderRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  dangerCopy: {
    flex: 1,
    gap: 4,
  },
  dangerDescription: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  dangerEyebrow: {
    ...typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dangerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
  },
  dangerIconWrap: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.compact,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dangerTitle: {
    ...typography.bodyBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  half: {
    flex: 1,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  infoPanel: {
    borderRadius: MOBILE_RADIUS.compact,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  infoPanelTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  interestGroup: {
    gap: 10,
  },
  interestGroupTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
    letterSpacing: -0.1,
  },
  interestGroups: {
    gap: 16,
  },
  passwordStrengthCard: {
    borderRadius: MOBILE_RADIUS.compact,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  passwordStrengthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passwordStrengthHint: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  passwordStrengthLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  passwordStrengthScore: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
  },
  passwordTrack: {
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  passwordTrackFill: {
    borderRadius: 999,
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
  tabPane: {
    gap: 20,
  },
  tabsSkeleton: {
    borderRadius: 16,
    height: 52,
  },
});
