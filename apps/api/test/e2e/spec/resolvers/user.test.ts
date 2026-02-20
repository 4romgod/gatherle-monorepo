import { Types } from 'mongoose';
import request from 'supertest';
import type { E2EServer } from '@/test/e2e/utils/server';
import { startE2EServer, stopE2EServer } from '@/test/e2e/utils/server';
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
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  loginUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

describe('User Resolver', () => {
  let server: E2EServer;
  let url = '';
  const TEST_PORT = 5003;
  const testPassword = 'testPassword';
  let adminUser: UserWithToken;
  const createdUserIds: string[] = [];

  const untrackUser = (userId: string) => {
    const idx = createdUserIds.indexOf(userId);
    if (idx >= 0) {
      createdUserIds.splice(idx, 1);
    }
  };

  const newUserInput = (suffix = uniqueSuffix()) =>
    buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, testPassword, suffix);

  beforeAll(async () => {
    server = await startE2EServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
  });

  afterAll(async () => {
    if (server) {
      await stopE2EServer(server);
    }
  });

  afterEach(async () => {
    await cleanupUsersById(url, adminUser.token, createdUserIds);
    createdUserIds.length = 0;
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

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(
            getUpdateUserMutation({
              userId: createdUser.userId,
              email: updatedEmail,
            }),
          );
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.updateUser.email).toBe(updatedEmail);
      });
    });

    describe('Delete User Mutations', () => {
      it('should delete a user by userId', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByIdMutation(createdUser.userId));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserById.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });

      it('should delete a user by email', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByEmailMutation(createdUser.email));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserByEmail.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });

      it('should delete a user by username', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByUsernameMutation(createdUser.username));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserByUsername.email).toBe(input.email);
        untrackUser(createdUser.userId);
      });
    });

    describe('readUsers Queries', () => {
      it('should retrieve users without options', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url).post('').send(getReadUsersWithoutOptionsQuery());
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
        const response = await request(url).post('').send(getReadUsersWithOptionsQuery(options));
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
        const response = await request(url).post('').send(getReadUsersWithOptionsQuery(options));
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

        const response = await request(url).post('').send(getReadUserByIdQuery(createdUser.userId));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserById.email).toBe(input.email);
      });

      it('retrieves user by email', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url).post('').send(getReadUserByEmailQuery(createdUser.email));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByEmail.email).toBe(input.email);
      });

      it('retrieves user by username', async () => {
        const input = newUserInput();
        const createdUser = await createUserOnServer(url, input, createdUserIds);

        const response = await request(url).post('').send(getReadUserByUsernameQuery(createdUser.username));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByUsername.email).toBe(input.email);
      });
    });
  });

  describe('Negative', () => {
    describe('createUser Mutation', () => {
      it('returns conflict when user already exists', async () => {
        const input = newUserInput();
        await createUserOnServer(url, input, createdUserIds);

        const response = await request(url).post('').send(getCreateUserMutation(input));
        expect(response.status).toBe(409);
      });

      it('validates phone numbers', async () => {
        const response = await request(url)
          .post('')
          .send(
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

        const response = await request(url)
          .post('')
          .send(getLoginUserMutation({ email: 'missing@example.com', password: testPassword }));
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });

      it('throws unauthorized for invalid password', async () => {
        const input = newUserInput();
        await createUserOnServer(url, input, createdUserIds);

        const response = await request(url)
          .post('')
          .send(getLoginUserMutation({ email: input.email, password: 'invalidPassword123' }));
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });
    });

    describe('updateUser Mutation', () => {
      it('returns conflict for duplicate field', async () => {
        const createdUser = await createUserOnServer(url, newUserInput('duplicate-a'), createdUserIds);
        const duplicateUser = await createUserOnServer(url, newUserInput('duplicate-b'), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getUpdateUserMutation({ userId: createdUser.userId, username: duplicateUser.username }));
        expect(response.status).toBe(409);
      });

      it('returns bad input when invalid phone number is provided', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getUpdateUserMutation({ userId: createdUser.userId, phone_number: 'invalid' }));
        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      });

      it('returns unauthorized when updating another user', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getUpdateUserMutation({ userId: new Types.ObjectId().toString(), given_name: 'nope' }));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserById Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + 'bad')
          .send(getDeleteUserByIdMutation(createdUser.userId));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when deleting another user', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByIdMutation(new Types.ObjectId().toString()));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByEmail Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + 'bad')
          .send(getDeleteUserByEmailMutation(createdUser.email));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByEmailMutation('another@example.com'));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByUsername Mutation', () => {
      it('returns unauthenticated for invalid token', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + 'bad')
          .send(getDeleteUserByUsernameMutation(createdUser.username));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const createdUser = await createUserOnServer(url, newUserInput(), createdUserIds);

        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + createdUser.token)
          .send(getDeleteUserByUsernameMutation('someoneElse'));
        expect(response.status).toBe(403);
      });
    });
  });
});
