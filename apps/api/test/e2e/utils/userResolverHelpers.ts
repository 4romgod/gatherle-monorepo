import request from 'supertest';
import type { CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { getCreateUserMutation, getDeleteUserByIdMutation, getLoginUserMutation } from '@/test/utils';
import { trackCreatedId } from './eventResolverHelpers';

export const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const buildCreateUserInput = (
  template: CreateUserInput,
  password: string,
  suffix = uniqueSuffix(),
): CreateUserInput => ({
  ...template,
  email: `test-${suffix}@example.com`,
  username: `testUsername-${suffix}`,
  password,
});

export const createUserOnServer = async (
  url: string,
  input: CreateUserInput,
  createdUserIds: string[],
): Promise<UserWithToken> => {
  const response = await request(url).post('').send(getCreateUserMutation(input));

  if (response.status !== 200 || response.body.errors || !response.body.data?.createUser?.userId) {
    throw new Error(`Failed to create user: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const createdUser = response.body.data.createUser as UserWithToken;
  trackCreatedId(createdUserIds, createdUser.userId);
  return createdUser;
};

export const loginUserOnServer = async (url: string, email: string, password: string): Promise<UserWithToken> => {
  const response = await request(url).post('').send(getLoginUserMutation({ email, password }));
  if (response.status !== 200 || response.body.errors || !response.body.data?.loginUser?.token) {
    throw new Error(`Failed to login user: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }
  return response.body.data.loginUser as UserWithToken;
};

export const cleanupUsersById = async (url: string, adminToken: string, userIds: string[]) => {
  await Promise.all(
    userIds.map((userId) =>
      request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(getDeleteUserByIdMutation(userId))
        .catch(() => {}),
    ),
  );
};
