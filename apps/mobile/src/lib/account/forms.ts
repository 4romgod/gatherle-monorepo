import type { MobileAccountProfile } from '@data/graphql/query/User/types';
import type { UpdateUserMutation } from '@data/graphql/types/graphql';
import { FollowPolicy, Gender, SocialVisibility, type UpdateUserInput } from '@data/graphql/types/graphql';
import type { ThemePreference } from '@/app/theme/palette';
import { featureFlags } from '@/lib/featureFlags';

export type EditProfileFormState = {
  bio: string;
  city: string;
  country: string;
  familyName: string;
  givenName: string;
  state: string;
  username: string;
};

export type SettingsFormState = {
  birthdate: string;
  communicationEmailEnabled: boolean;
  communicationPushEnabled: boolean;
  defaultVisibility: SocialVisibility;
  email: string;
  followPolicy: FollowPolicy;
  followersListVisibility: SocialVisibility;
  followingListVisibility: SocialVisibility;
  gender: Gender | null;
  phoneNumber: string;
  shareCheckinsByDefault: boolean;
  shareRsvpByDefault: boolean;
  themePreference: ThemePreference;
};

type MutableAccountUser = MobileAccountProfile | NonNullable<UpdateUserMutation['updateUser']>;

export function createEditProfileForm(profile: MutableAccountUser | null): EditProfileFormState {
  return {
    bio: profile?.bio ?? '',
    city: profile?.location?.city ?? '',
    country: profile?.location?.country ?? '',
    familyName: profile?.family_name ?? '',
    givenName: profile?.given_name ?? '',
    state: profile?.location?.state ?? '',
    username: profile?.username ?? '',
  };
}

export function createSettingsForm(
  profile: MutableAccountUser | null,
  themePreference: ThemePreference,
): SettingsFormState {
  const privateUsersEnabled = featureFlags.enablePrivateUsers;

  return {
    birthdate: profile?.birthdate ?? '',
    communicationEmailEnabled: profile?.preferences?.communicationPrefs?.emailEnabled ?? true,
    communicationPushEnabled: profile?.preferences?.communicationPrefs?.pushEnabled ?? true,
    defaultVisibility: privateUsersEnabled
      ? (profile?.defaultVisibility ?? SocialVisibility.Public)
      : SocialVisibility.Public,
    email: profile?.email ?? '',
    followPolicy: privateUsersEnabled ? (profile?.followPolicy ?? FollowPolicy.Public) : FollowPolicy.Public,
    followersListVisibility: privateUsersEnabled
      ? (profile?.followersListVisibility ?? SocialVisibility.Public)
      : SocialVisibility.Public,
    followingListVisibility: privateUsersEnabled
      ? (profile?.followingListVisibility ?? SocialVisibility.Public)
      : SocialVisibility.Public,
    gender: profile?.gender ?? null,
    phoneNumber: profile?.phone_number ?? '',
    shareCheckinsByDefault: profile?.shareCheckinsByDefault ?? true,
    shareRsvpByDefault: profile?.shareRSVPByDefault ?? true,
    themePreference,
  };
}

export function buildEditProfileInput(profile: MobileAccountProfile, form: EditProfileFormState): UpdateUserInput {
  const city = form.city.trim();
  const country = form.country.trim();
  const state = form.state.trim();
  const hasLocation = Boolean(city || country || state);

  return {
    bio: form.bio.trim() || null,
    family_name: form.familyName.trim(),
    given_name: form.givenName.trim(),
    location: hasLocation
      ? {
          city,
          country,
          state: state || undefined,
        }
      : null,
    userId: profile.userId,
    username: form.username.trim(),
  };
}

export function buildSettingsInput(profile: MobileAccountProfile, form: SettingsFormState): UpdateUserInput {
  const privateUsersEnabled = featureFlags.enablePrivateUsers;

  return {
    birthdate: form.birthdate.trim() || undefined,
    defaultVisibility: privateUsersEnabled ? form.defaultVisibility : SocialVisibility.Public,
    email: form.email.trim(),
    followersListVisibility: privateUsersEnabled ? form.followersListVisibility : SocialVisibility.Public,
    followingListVisibility: privateUsersEnabled ? form.followingListVisibility : SocialVisibility.Public,
    followPolicy: privateUsersEnabled ? form.followPolicy : FollowPolicy.Public,
    gender: form.gender ?? undefined,
    phone_number: form.phoneNumber.trim() || undefined,
    preferences: {
      communicationPrefs: {
        emailEnabled: form.communicationEmailEnabled,
        pushEnabled: form.communicationPushEnabled,
      },
    },
    shareCheckinsByDefault: form.shareCheckinsByDefault,
    shareRSVPByDefault: form.shareRsvpByDefault,
    userId: profile.userId,
  };
}

export function validateEditProfileForm(form: EditProfileFormState): string | null {
  if (!form.givenName.trim()) {
    return 'First name is required.';
  }

  if (!form.familyName.trim()) {
    return 'Last name is required.';
  }

  if (form.username.trim().length < 3) {
    return 'Username must be at least 3 characters.';
  }

  const hasLocation = Boolean(form.city.trim() || form.country.trim() || form.state.trim());
  if (hasLocation && (!form.city.trim() || !form.country.trim())) {
    return 'Location needs both a city and country.';
  }

  return null;
}

export function validateSettingsForm(form: SettingsFormState): string | null {
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Enter a valid email address.';
  }

  if (form.birthdate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthdate.trim())) {
    return 'Birthdate must use YYYY-MM-DD.';
  }

  return null;
}
