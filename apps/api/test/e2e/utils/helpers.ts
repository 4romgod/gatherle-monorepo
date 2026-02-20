import request from 'supertest';
import { testAdminSeedUser, testUserSeedUser, testUser2SeedUser } from '@/mongodb/mockData';
import type { UserWithToken } from '@gatherle/commons/types';
import { getLoginUserMutation, getReadEventCategoriesQuery } from '@/test/utils';

export type SeededUserCredentials = {
  email: string;
  password: string;
};

export type SeededTestUsers = {
  admin: SeededUserCredentials;
  user: SeededUserCredentials;
  user2: SeededUserCredentials;
};

export type EventCategoryRef = {
  eventCategoryId: string;
  slug: string;
};

export const requirePassword = (email: string, password?: string): string => {
  if (!password) {
    throw new Error(`Seeded user ${email} is missing a password in mockData.`);
  }
  return password;
};

export const getSeededTestUsers = (): SeededTestUsers => ({
  admin: {
    email: testAdminSeedUser.email,
    password: requirePassword(testAdminSeedUser.email, testAdminSeedUser.password),
  },
  user: {
    email: testUserSeedUser.email,
    password: requirePassword(testUserSeedUser.email, testUserSeedUser.password),
  },
  user2: {
    email: testUser2SeedUser.email,
    password: requirePassword(testUser2SeedUser.email, testUser2SeedUser.password),
  },
});

export const loginSeededUser = async (url: string, email: string, password: string): Promise<UserWithToken> => {
  const response = await request(url).post('').send(getLoginUserMutation({ email, password }));

  if (response.status !== 200 || response.body.errors || !response.body.data?.loginUser?.token) {
    throw new Error(`Failed to login seeded user ${email}: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  return response.body.data.loginUser as UserWithToken;
};

export const readFirstEventCategory = async (url: string): Promise<EventCategoryRef> => {
  const categoriesResponse = await request(url).post('').send(getReadEventCategoriesQuery());

  if (categoriesResponse.status !== 200 || categoriesResponse.body.errors) {
    throw new Error(`Failed to read seeded event categories: ${JSON.stringify(categoriesResponse.body.errors)}`);
  }

  const [firstCategory] = categoriesResponse.body.data?.readEventCategories ?? [];
  if (!firstCategory?.eventCategoryId) {
    throw new Error('No seeded event categories were found. Run the seed script before e2e tests.');
  }

  return {
    eventCategoryId: firstCategory.eventCategoryId,
    slug: firstCategory.slug,
  };
};
