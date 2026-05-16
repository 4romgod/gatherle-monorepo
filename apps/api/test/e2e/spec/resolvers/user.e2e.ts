import { Types } from 'mongoose';
import { usersMockData } from '@/mongodb/mockData';
import {
  getCreateUserMutation,
  getDeleteUserByEmailMutation,
  getDeleteUserByIdMutation,
  getDeleteUserByUsernameMutation,
  getLoginUserMutation,
  getReadUserByEmailQuery,
  getReadUserByIdQuery,
  getReadUserByUsernameQuery,
  getReadUsersWithOptionsQuery,
  getReadUsersWithoutOptionsQuery,
  getUpdateUserMutation,
} from '@/test/utils';
import type { CreateUserInput, QueryOptionsInput, UserWithToken } from '@gatherle/commons/types';
import { Gender } from '@gatherle/commons/types';
import { ERROR_MESSAGES } from '@/validation';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import { assertNoCleanupFailures } from '@/test/e2e/utils/eventSeriesResolverHelpers';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  loginUserOnServer,
  postGraphQLWithRetry,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

describe('User Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const testPassword = 'testPassword';
  let adminUser: UserWithToken;
  let seededUser: UserWithToken;
  const createdUserIds: string[] = [];

  const getSensitiveReadUserByIdQuery = (userId: string) => ({
    query: `query GetSensitiveUserById($userId: String!) {
      readUserById(userId: $userId) {
        userId
        email
        username
        birthdate
        phone_number
        mutedUserIds
        blockedUserIds
      }
    }`,
    variables: { userId },
  });

  const getSensitiveReadUserByUsernameQuery = (username: string) => ({
    query: `query GetSensitiveUserByUsername($username: String!) {
      readUserByUsername(username: $username) {
        userId
        email
        username
        birthdate
        phone_number
        mutedUserIds
        blockedUserIds
      }
    }`,
    variables: { username },
  });

  const getSensitiveReadUsersQuery = () => ({
    query: `query GetSensitiveUsers {
      readUsers {
        userId
        email
        username
        birthdate
        phone_number
        mutedUserIds
        blockedUserIds
      }
    }`,
  });

  const untrackUser = (userId: string) => {
    const idx = createdUserIds.indexOf(userId);
    if (idx >= 0) {
      createdUserIds.splice(idx, 1);
    }
  };

  const newUserInput = (suffix = uniqueSuffix()) =>
    buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, testPassword, suffix);

  const sendUserGraphQL = (payload: object, token?: string) => postGraphQLWithRetry(url, payload, token);

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    seededUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
  });

  afterEach(async () => {
    if (!adminUser?.token) {
      return;
    }

    await cleanupUsersById(url, adminUser.token, createdUserIds);
  });

  afterAll(async () => {
    if (!adminUser?.token) {
      return;
    }

    const failures = await cleanupUsersById(url, adminUser.token, createdUserIds, 'afterAll');
    assertNoCleanupFailures(failures);
  });

  describe('Positive', () => {
    describe('createUser Mutation', () => {
      it('should create new user when valid input is provided', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        expect(createdUser).toHaveProperty('userId');
        expect(createdUser.email).toBe(input.email);
      });
    });

    describe('loginUser Mutation', () => {
      it('should login a user when valid input is provided', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);
        const loggedInUser = await loginUserOnServer(url, input.email, testPassword);

        expect(loggedInUser.userId).toBe(createdUser.userId);
        expect(loggedInUser.email).toBe(input.email);
        expect(loggedInUser.token).toBeTruthy();
      });
    });

    describe('updateUser Mutation', () => {
      it('should update a user when valid input is provided', async () => {
        const input = newUserInput();
        const updatedEmail = `updated-${uniqueSuffix()}@email.com`;
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(
          getUpdateUserMutation({
            userId: createdUser.userId,
            email: updatedEmail,
          }),
          createdUser.token,
        );
        expect(response.status).toBe(200);
        expect(response.body.data.updateUser.email).toBe(updatedEmail);
      });
    });

    describe('Delete User Mutations', () => {
      it('should delete a user by userId', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByIdMutation(createdUser.userId), createdUser.token);
        expect(response.status).toBe(200);
        expect(response.body.data.deleteUserById.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });

      it('should delete a user by email', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByEmailMutation(createdUser.email), createdUser.token);
        expect(response.status).toBe(200);
        expect(response.body.data.deleteUserByEmail.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });

      it('should delete a user by username', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(
          getDeleteUserByUsernameMutation(createdUser.username),
          createdUser.token,
        );
        expect(response.status).toBe(200);
        expect(response.body.data.deleteUserByUsername.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });
    });

    describe('readUsers Queries', () => {
      it('should retrieve users without options', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getReadUsersWithoutOptionsQuery(), createdUser.token);
        expect(response.status).toBe(200);
        const users = response.body.data.readUsers;
        const found = users.find((user: any) => user.userId === createdUser.userId);
        expect(found).toBeDefined();
      });

      it('should retrieve users with filter options', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const options: QueryOptionsInput = {
          filters: [
            {
              field: 'gender',
              value: Gender.Male,
            },
          ],
        };
        const response = await sendUserGraphQL(getReadUsersWithOptionsQuery(options), createdUser.token);
        expect(response.status).toBe(200);
        const users = response.body.data.readUsers;
        const found = users.find((user: any) => user.userId === createdUser.userId);
        expect(found).toBeDefined();
      });

      it('should retrieve users with text search options', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const options: QueryOptionsInput = {
          search: {
            fields: ['username', 'email'],
            value: (input.username ?? '').toLowerCase(),
          },
        };
        const response = await sendUserGraphQL(getReadUsersWithOptionsQuery(options), createdUser.token);
        expect(response.status).toBe(200);
        const users = response.body.data.readUsers;
        const found = users.find((user: any) => user.userId === createdUser.userId);
        expect(found).toBeDefined();
      });
    });

    describe('Read User Queries', () => {
      it('retrieves user by id', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getReadUserByIdQuery(createdUser.userId), createdUser.token);
        expect(response.status).toBe(200);
        expect(response.body.data.readUserById.email).toBe(input.email);
      });

      it('retrieves user by email', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getReadUserByEmailQuery(createdUser.email), createdUser.token);
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByEmail.email).toBe(input.email);
      });

      it('retrieves user by username', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getReadUserByUsernameQuery(createdUser.username), createdUser.token);
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByUsername.email).toBe(input.email);
      });

      it('redacts sensitive fields for public readUserById queries', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getSensitiveReadUserByIdQuery(createdUser.userId));

        expect(response.status).toBe(200);
        expect(response.body.data.readUserById).toEqual({
          userId: createdUser.userId,
          email: '',
          username: createdUser.username,
          birthdate: null,
          phone_number: null,
          mutedUserIds: [],
          blockedUserIds: [],
        });
      });

      it('redacts sensitive fields for public readUserByUsername queries', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getSensitiveReadUserByUsernameQuery(createdUser.username));

        expect(response.status).toBe(200);
        expect(response.body.data.readUserByUsername).toEqual({
          userId: createdUser.userId,
          email: '',
          username: createdUser.username,
          birthdate: null,
          phone_number: null,
          mutedUserIds: [],
          blockedUserIds: [],
        });
      });
    });
  });

  describe('Negative', () => {
    describe('createUser Mutation', () => {
      it('returns conflict when user already exists', async () => {
        const input = newUserInput();
        await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(getCreateUserMutation(input));
        expect(response.status).toBe(409);
      });

      it('validates phone numbers', async () => {
        const response = await sendUserGraphQL(
          getCreateUserMutation({
            ...newUserInput(),
            phone_number: 'not-a-phone',
          }),
        );
        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      });
    });

    describe('loginUser Mutation', () => {
      it('throws unauthorized for invalid email', async () => {
        const input = newUserInput();
        await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(
          getLoginUserMutation({ email: 'missing@example.com', password: testPassword }),
        );
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });

      it('throws unauthorized for invalid password', async () => {
        const input = newUserInput();
        await createUserOnServer(url, input, createdUserIds);

        const response = await sendUserGraphQL(
          getLoginUserMutation({ email: input.email, password: 'invalidPassword123' }),
        );
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });
    });

    describe('readUsers Query', () => {
      it('returns unauthenticated when no auth token is provided', async () => {
        const response = await sendUserGraphQL(getReadUsersWithoutOptionsQuery());

        expect(response.status).toBe(401);
        expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      });

      it('redacts sensitive fields when another regular user reads the list', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getSensitiveReadUsersQuery(), seededUser.token);
        const found = response.body.data.readUsers.find((user: any) => user.userId === createdUser.userId);

        expect(response.status).toBe(200);
        expect(found).toEqual({
          userId: createdUser.userId,
          email: '',
          username: createdUser.username,
          birthdate: null,
          phone_number: null,
          mutedUserIds: [],
          blockedUserIds: [],
        });
      });
    });

    describe('readUserByEmail Query', () => {
      it('returns unauthorized when a different non-admin user queries someone else by email', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getReadUserByEmailQuery(createdUser.email), seededUser.token);

        expect(response.status).toBe(403);
        expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      });
    });

    describe('updateUser Mutation', () => {
      it('returns conflict for duplicate field', async () => {
        const duplicateSuffix = uniqueSuffix();
        const createdUser = await createUserOnServer(
          url,
          newUserInput(`duplicate-a-${duplicateSuffix}`),
          createdUserIds,
        );
        const duplicateUser = await createUserOnServer(
          url,
          newUserInput(`duplicate-b-${duplicateSuffix}`),
          createdUserIds,
        );

        const response = await sendUserGraphQL(
          getUpdateUserMutation({ userId: createdUser.userId, username: duplicateUser.username }),
          createdUser.token,
        );
        expect(response.status).toBe(409);
      });

      it('returns bad input when invalid phone number is provided', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(
          getUpdateUserMutation({ userId: createdUser.userId, phone_number: 'invalid' }),
          createdUser.token,
        );
        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      });

      it('returns unauthorized when updating another user', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(
          getUpdateUserMutation({ userId: new Types.ObjectId().toString(), given_name: 'nope' }),
          createdUser.token,
        );
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserById Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByIdMutation(createdUser.userId), 'bad');
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when deleting another user', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(
          getDeleteUserByIdMutation(new Types.ObjectId().toString()),
          createdUser.token,
        );
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByEmail Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByEmailMutation(createdUser.email), 'bad');
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByEmailMutation('another@example.com'), createdUser.token);
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByUsername Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByUsernameMutation(createdUser.username), 'bad');
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await sendUserGraphQL(getDeleteUserByUsernameMutation('someoneElse'), createdUser.token);
        expect(response.status).toBe(403);
      });
    });
  });
});
