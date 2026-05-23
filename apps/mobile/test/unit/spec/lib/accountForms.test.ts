import { FollowPolicy, Gender, SocialVisibility, UserRole } from '@data/graphql/types/graphql';
import {
  buildEditProfileInput,
  buildSettingsInput,
  createEditProfileForm,
  createSettingsForm,
  validateEditProfileForm,
  validateSettingsForm,
  type EditProfileFormState,
  type SettingsFormState,
} from '@/lib/account/forms';
import { buildProfileBadges } from '@/lib/account/profileBadges';

const profile = {
  bio: 'Bio',
  birthdate: '1990-01-02',
  defaultVisibility: SocialVisibility.Followers,
  email: 'user@example.com',
  family_name: 'User',
  followPolicy: FollowPolicy.RequireApproval,
  followersListVisibility: SocialVisibility.Private,
  followingListVisibility: SocialVisibility.Followers,
  gender: Gender.Other,
  given_name: 'Test',
  location: { city: 'Cape Town', country: 'South Africa', state: 'Western Cape' },
  phone_number: '+27123456789',
  preferences: { communicationPrefs: { emailEnabled: false, pushEnabled: true } },
  shareCheckinsByDefault: false,
  shareRSVPByDefault: false,
  userId: 'user-1',
  username: 'tester',
} as any;

describe('mobile account form helpers', () => {
  it('creates edit-profile and settings forms from profile data with safe defaults', () => {
    expect(createEditProfileForm(profile)).toEqual({
      bio: 'Bio',
      city: 'Cape Town',
      country: 'South Africa',
      familyName: 'User',
      givenName: 'Test',
      state: 'Western Cape',
      username: 'tester',
    });

    expect(createEditProfileForm(null)).toEqual({
      bio: '',
      city: '',
      country: '',
      familyName: '',
      givenName: '',
      state: '',
      username: '',
    });

    expect(createSettingsForm(profile, 'dark')).toMatchObject({
      birthdate: '1990-01-02',
      communicationEmailEnabled: false,
      communicationPushEnabled: true,
      defaultVisibility: SocialVisibility.Followers,
      email: 'user@example.com',
      followPolicy: FollowPolicy.RequireApproval,
      followersListVisibility: SocialVisibility.Private,
      followingListVisibility: SocialVisibility.Followers,
      gender: Gender.Other,
      phoneNumber: '+27123456789',
      shareCheckinsByDefault: false,
      shareRsvpByDefault: false,
      themePreference: 'dark',
    });

    expect(createSettingsForm(null, 'system')).toMatchObject({
      communicationEmailEnabled: true,
      communicationPushEnabled: true,
      defaultVisibility: SocialVisibility.Public,
      email: '',
      followPolicy: FollowPolicy.Public,
      gender: null,
      shareCheckinsByDefault: true,
      shareRsvpByDefault: true,
      themePreference: 'system',
    });
  });

  it('builds trimmed update inputs and clears empty optional values', () => {
    const editForm: EditProfileFormState = {
      bio: '  Updated bio  ',
      city: '  Durban ',
      country: ' South Africa ',
      familyName: ' User ',
      givenName: ' Test ',
      state: ' ',
      username: ' tester2 ',
    };

    expect(buildEditProfileInput(profile, editForm)).toEqual({
      bio: 'Updated bio',
      family_name: 'User',
      given_name: 'Test',
      location: { city: 'Durban', country: 'South Africa', state: undefined },
      userId: 'user-1',
      username: 'tester2',
    });

    expect(
      buildEditProfileInput(profile, { ...editForm, bio: ' ', city: ' ', country: ' ', state: ' ' }),
    ).toMatchObject({
      bio: null,
      location: null,
    });

    const settingsForm: SettingsFormState = {
      ...createSettingsForm(profile, 'light'),
      birthdate: ' ',
      email: ' new@example.com ',
      gender: null,
      phoneNumber: ' ',
    };

    expect(buildSettingsInput(profile, settingsForm)).toMatchObject({
      birthdate: undefined,
      email: 'new@example.com',
      gender: undefined,
      phone_number: undefined,
      userId: 'user-1',
    });
  });

  it('validates required profile fields, location pairing, email, and birthdate', () => {
    const validEdit = createEditProfileForm(profile);
    expect(validateEditProfileForm(validEdit)).toBeNull();
    expect(validateEditProfileForm({ ...validEdit, givenName: ' ' })).toBe('First name is required.');
    expect(validateEditProfileForm({ ...validEdit, familyName: ' ' })).toBe('Last name is required.');
    expect(validateEditProfileForm({ ...validEdit, username: 'ab' })).toBe('Username must be at least 3 characters.');
    expect(validateEditProfileForm({ ...validEdit, city: 'Pretoria', country: ' ' })).toBe(
      'Location needs both a city and country.',
    );

    const validSettings = createSettingsForm(profile, 'dark');
    expect(validateSettingsForm(validSettings)).toBeNull();
    expect(validateSettingsForm({ ...validSettings, email: 'bad' })).toBe('Enter a valid email address.');
    expect(validateSettingsForm({ ...validSettings, birthdate: '01-01-1990' })).toBe('Birthdate must use YYYY-MM-DD.');
  });

  it('builds role-specific profile badges', () => {
    expect(buildProfileBadges({ userRole: UserRole.Admin })).toEqual([
      expect.objectContaining({ icon: 'shield-star', label: 'Admin', tone: 'primary' }),
    ]);
    expect(buildProfileBadges({ userRole: UserRole.Host })).toEqual([
      expect.objectContaining({ icon: 'lightning-bolt', label: 'Host', tone: 'secondary' }),
    ]);
    expect(buildProfileBadges({ userRole: UserRole.User })).toEqual([]);
    expect(buildProfileBadges({ userRole: null })).toEqual([]);
  });
});
