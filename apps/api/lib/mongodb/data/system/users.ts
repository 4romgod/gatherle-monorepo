import { IMPORTED_EVENT_SYSTEM_USERNAME } from '@gatherle/commons/constants';
import { FollowPolicy, Gender, SocialVisibility, UserRole } from '@gatherle/commons/types/user';
import type { SystemUserSeedData } from './types';

export const importedEventsSystemUser: SystemUserSeedData = {
  email: 'imports@gatherle.com',
  username: IMPORTED_EVENT_SYSTEM_USERNAME,
  birthdate: '1990-01-01',
  family_name: 'Imports',
  given_name: 'Gatherle',
  gender: Gender.Other,
  phone_number: '+27820000090',
  userRole: UserRole.Admin,
  primaryTimezone: 'Africa/Johannesburg',
  defaultVisibility: SocialVisibility.Private,
  socialVisibility: SocialVisibility.Private,
  followPolicy: FollowPolicy.RequireApproval,
  shareRSVPByDefault: false,
  shareCheckinsByDefault: false,
  bio: 'System-managed organizer identity for Gatherle imported public events.',
  passwordEnvVar: 'GATHERLE_IMPORTS_PASSWORD',
  passwordPromptLabel: 'Password for imports@gatherle.com',
  seedInterests: false,
};

export const testAdminSystemUser: SystemUserSeedData = {
  email: 'test-admin@gatherle.com',
  username: 'gatherle-test-admin',
  birthdate: '1990-01-01',
  family_name: 'Admin',
  given_name: 'Test',
  gender: Gender.Other,
  phone_number: '+27820000000',
  userRole: UserRole.Admin,
  defaultVisibility: SocialVisibility.Public,
  socialVisibility: SocialVisibility.Public,
  followPolicy: FollowPolicy.Public,
  passwordEnvVar: 'GATHERLE_TEST_ADMIN_PASSWORD',
  passwordPromptLabel: 'Password for test-admin@gatherle.com',
};

export const testUserSystemUser: SystemUserSeedData = {
  email: 'test-user@gatherle.com',
  username: 'gatherle-test-user',
  birthdate: '1992-05-15',
  family_name: 'User',
  given_name: 'Test',
  gender: Gender.Other,
  phone_number: '+27820000001',
  userRole: UserRole.User,
  defaultVisibility: SocialVisibility.Public,
  socialVisibility: SocialVisibility.Public,
  followPolicy: FollowPolicy.Public,
  passwordEnvVar: 'GATHERLE_TEST_USER_PASSWORD',
  passwordPromptLabel: 'Password for test-user@gatherle.com',
};

export const testUser2SystemUser: SystemUserSeedData = {
  email: 'test-user2@gatherle.com',
  username: 'gatherle-test-user2',
  birthdate: '1991-08-21',
  family_name: 'Other',
  given_name: 'Test',
  gender: Gender.Other,
  phone_number: '+27820000002',
  userRole: UserRole.User,
  defaultVisibility: SocialVisibility.Public,
  socialVisibility: SocialVisibility.Public,
  followPolicy: FollowPolicy.Public,
  passwordEnvVar: 'GATHERLE_TEST_USER2_PASSWORD',
  passwordPromptLabel: 'Password for test-user2@gatherle.com',
};

export const systemUsers: SystemUserSeedData[] = [
  importedEventsSystemUser,
  testAdminSystemUser,
  testUserSystemUser,
  testUser2SystemUser,
];

export const testSystemUsers: SystemUserSeedData[] = [testAdminSystemUser, testUserSystemUser, testUser2SystemUser];

export const readSystemUserPasswordFromEnv = (user: SystemUserSeedData): string | undefined => {
  const value = process.env[user.passwordEnvVar];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

export const requireSystemUserPasswordFromEnv = (user: SystemUserSeedData): string => {
  const password = readSystemUserPasswordFromEnv(user);
  if (!password) {
    const ciHint =
      process.env.GITHUB_ACTIONS === 'true'
        ? ` Add the GitHub Environment secret named ${user.passwordEnvVar} for this workflow target.`
        : '';
    throw new Error(`Missing ${user.passwordEnvVar} for seeded system user ${user.email}.${ciHint}`);
  }
  return password;
};

export default systemUsers;
