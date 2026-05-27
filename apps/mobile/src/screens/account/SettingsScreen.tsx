import { useLazyQuery, useMutation } from '@apollo/client';
import { UpdateUserDocument } from '@data/graphql/mutation/User/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { FollowPolicy, Gender, MediaEntityType, MediaType, SocialVisibility } from '@data/graphql/types/graphql';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList, SettingsTabKey } from '@/app/navigation/routes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
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
import { getApolloAuthContext } from '@/lib/auth';
import { featureFlags } from '@/lib/featureFlags';
import { MOBILE_MEDIA_PICKER_ASPECTS } from '@/lib/media/constants';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';

const VISIBILITY_OPTIONS = [SocialVisibility.Public, SocialVisibility.Followers, SocialVisibility.Private];
const GENDER_OPTIONS = [Gender.Male, Gender.Female, Gender.Other];

type SettingsRoute = RouteProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<SettingsRoute>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated, setPendingVerificationEmail, updateSessionIdentity, userId, username } =
    useAppShell();
  const { preference, setPreference, theme } = useAppTheme();
  const { error, loading, profile, refetch } = useAccountProfile(username, authToken, isAuthenticated);
  const [updateUser, { loading: saving }] = useMutation(UpdateUserDocument);
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });
  const [profileForm, setProfileForm] = useState(() => createEditProfileForm(null));
  const [settingsForm, setSettingsForm] = useState(() => createSettingsForm(null, preference));
  const [selectedAvatarAsset, setSelectedAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
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

  const visibilityCopy = useMemo(
    () => ({
      [SocialVisibility.Followers]: 'Followers',
      [SocialVisibility.Private]: 'Only me',
      [SocialVisibility.Public]: 'Everyone',
    }),
    [],
  );

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
    );

    return routes;
  }, [
    avatarPreviewUrl,
    handleSaveProfile,
    preference,
    profile,
    profileForm,
    renderSettingsSaveButton,
    setPreference,
    settingsForm,
    theme.colors.textPrimary,
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
  half: {
    flex: 1,
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
