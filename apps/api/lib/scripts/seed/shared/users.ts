import { UserDAO } from '@/mongodb/dao';
import { readSystemUserPasswordFromEnv } from '@/mongodb/data/system';
import type { SystemUserSeedData } from '@/mongodb/data/system';
import { logger } from '@/utils/logger';
import type { CreateUserInput, User } from '@gatherle/commons/types';
import { promptForHiddenValue } from './prompt';
import { getRandomUniqueItems } from './random';

export async function markSeedUserVerified(userId: string, email: string) {
  await UserDAO.setEmailVerified(userId);
  logger.info(`   Marked seeded user ${email} as email verified.`);
}

type EnsureSystemUsersOptions = {
  eventCategoryIds?: string[];
  interestCount?: number;
};

function buildSeedUserInput(
  userData: SystemUserSeedData,
  password: string,
  { eventCategoryIds = [], interestCount = 5 }: EnsureSystemUsersOptions,
): CreateUserInput {
  const {
    passwordEnvVar: _passwordEnvVar,
    passwordPromptLabel: _passwordPromptLabel,
    seedInterests,
    ...userFields
  } = userData;
  const interests =
    seedInterests !== false && eventCategoryIds.length > 0
      ? getRandomUniqueItems(eventCategoryIds, interestCount)
      : undefined;

  return {
    ...userFields,
    password,
    ...(interests ? { interests } : {}),
  };
}

async function resolveSystemUserPassword(userData: SystemUserSeedData): Promise<string> {
  const envPassword = readSystemUserPasswordFromEnv(userData);
  if (envPassword) {
    return envPassword;
  }

  const password = await promptForHiddenValue(`${userData.passwordPromptLabel ?? `Password for ${userData.email}`}: `);
  if (!password.trim()) {
    throw new Error(`Password is required for system user ${userData.email}.`);
  }

  return password;
}

async function ensureSystemUser(userData: SystemUserSeedData, options: EnsureSystemUsersOptions): Promise<User> {
  try {
    const existingUser = await UserDAO.readUserByEmail(userData.email);
    const updatedUser = await UserDAO.updateUser({
      userId: existingUser.userId,
      username: userData.username,
      birthdate: userData.birthdate,
      family_name: userData.family_name,
      given_name: userData.given_name,
      gender: userData.gender,
      phone_number: userData.phone_number,
      profile_picture: userData.profile_picture,
      bio: userData.bio,
      location: userData.location,
      primaryTimezone: userData.primaryTimezone,
      defaultVisibility: userData.defaultVisibility,
      socialVisibility: userData.socialVisibility,
      followPolicy: userData.followPolicy,
      shareRSVPByDefault: userData.shareRSVPByDefault,
      shareCheckinsByDefault: userData.shareCheckinsByDefault,
      userRole: userData.userRole,
      isTestUser: true,
    });

    if (!updatedUser.emailVerified) {
      await markSeedUserVerified(updatedUser.userId, userData.email);
      return UserDAO.readUserByEmail(userData.email);
    }

    logger.info(`   System user ${userData.email} already exists, updated seed properties.`);
    return updatedUser;
  } catch {
    const password = await resolveSystemUserPassword(userData);
    const createdUser = await UserDAO.create(buildSeedUserInput(userData, password, options));
    await UserDAO.updateUser({
      userId: createdUser.userId,
      userRole: userData.userRole,
      isTestUser: true,
    });
    await markSeedUserVerified(createdUser.userId, userData.email);
    logger.info(`   Created system user ${userData.email}.`);
    return UserDAO.readUserByEmail(userData.email);
  }
}

export async function ensureSystemUsers(
  users: SystemUserSeedData[],
  options: EnsureSystemUsersOptions = {},
): Promise<User[]> {
  logger.info('Ensuring system users exist...');

  const ensuredUsers: User[] = [];
  const failures: Array<{ email: string; message: string }> = [];

  for (const userData of users) {
    try {
      ensuredUsers.push(await ensureSystemUser(userData, options));
    } catch (error) {
      logger.warn(`   Failed to seed system user ${userData.email}:`, { error });
      failures.push({
        email: userData.email,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (failures.length > 0) {
    const summary = failures.map((failure) => `${failure.email}: ${failure.message}`).join('; ');
    throw new Error(`System-user seed failed for ${failures.length} account(s): ${summary}`);
  }

  return ensuredUsers;
}
