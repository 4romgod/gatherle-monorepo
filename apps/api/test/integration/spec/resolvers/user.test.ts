import {Types} from 'mongoose';
import request from 'supertest';
import type {IntegrationServer} from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {usersMockData} from '@/mongodb/mockData';
import {UserDAO} from '@/mongodb/dao';
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
import type {CreateUserInput, QueryOptionsInput, User, UserWithToken} from '@ntlango/commons/types';
import { Gender} from '@ntlango/commons/types';
import {ERROR_MESSAGES} from '@/validation';
import {verifyToken} from '@/utils/auth';

describe('User Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5003;
  const testUserEmail = 'test@example.com';
  const testUsername = 'testUsername';
  const testPassword = 'testPassword';
  const cleanUserByEmail = async (email: string) => {
    try {
      await UserDAO.deleteUserByEmail(email);
    } catch {
      // ignore missing records
    }
  };
  let createUserInput: CreateUserInput;

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    createUserInput = {
      ...usersMockData.at(0)!,
      email: testUserEmail,
      username: testUsername,
      password: testPassword,
    };
  });

  afterAll(async () => {
    await stopIntegrationServer(server);
  });

  describe('Positive', () => {
    describe('createUser Mutation', () => {
      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('should create new user when valid input is provided', async () => {
        const response = await request(url).post('').send(getCreateUserMutation(createUserInput));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.createUser).toHaveProperty('userId');
        expect(response.body.data.createUser.email).toBe(testUserEmail);
      });
    });

    describe('loginUser Mutation', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('should login a user when valid input is provided', async () => {
        const response = await request(url).post('').send(
          getLoginUserMutation({
            email: testUserEmail,
            password: testPassword,
          }),
        );
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        const decoded = (await verifyToken(response.body.data.loginUser.token)) as User;
        expect(decoded.userId).toBe(createdUser.userId);
      });
    });

    describe('updateUser Mutation', () => {
      const updatedEmail = 'updated@email.com';

      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(updatedEmail);
      });

      it('should update a user when valid input is provided', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(
            getUpdateUserMutation({
              ...createUserInput,
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
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      it('should delete a user by userId', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByIdMutation(createdUser.userId));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserById.email).toBe(testUserEmail);
      });

      it('should delete a user by email', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByEmailMutation(createdUser.email));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserByEmail.email).toBe(testUserEmail);
      });

      it('should delete a user by username', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByUsernameMutation(createdUser.username));
        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        expect(response.body.data.deleteUserByUsername.email).toBe(testUserEmail);
      });
    });

    describe('readUsers Queries', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('should retrieve users without options', async () => {
        const response = await request(url).post('').send(getReadUsersWithoutOptionsQuery());
        expect(response.status).toBe(200);
        const users = response.body.data.readUsers;
        const found = users.find((user: any) => user.userId === createdUser.userId);
        expect(found).toBeDefined();
      });

      it('should retrieve users with filter options', async () => {
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
    });

    describe('Read User Queries', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('retrieves user by id', async () => {
        const response = await request(url).post('').send(getReadUserByIdQuery(createdUser.userId));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserById.email).toBe(testUserEmail);
      });

      it('retrieves user by email', async () => {
        const response = await request(url).post('').send(getReadUserByEmailQuery(createdUser.email));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByEmail.email).toBe(testUserEmail);
      });

      it('retrieves user by username', async () => {
        const response = await request(url).post('').send(getReadUserByUsernameQuery(createdUser.username));
        expect(response.status).toBe(200);
        expect(response.body.data.readUserByUsername.email).toBe(testUserEmail);
      });
    });
  });

  describe('Negative', () => {
    describe('createUser Mutation', () => {
      it('returns conflict when user already exists', async () => {
        await request(url).post('').send(getCreateUserMutation(createUserInput));
        const response = await request(url).post('').send(getCreateUserMutation(createUserInput));
        expect(response.status).toBe(409);
        await cleanUserByEmail(testUserEmail);
      });

      it('validates phone numbers', async () => {
        const response = await request(url)
          .post('')
          .send(getCreateUserMutation({
            ...createUserInput,
            phone_number: 'not-a-phone',
          }));
        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      });
    });

    describe('loginUser Mutation', () => {
      beforeEach(async () => {
        await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('throws unauthorized for invalid email', async () => {
        const response = await request(url)
          .post('')
          .send(getLoginUserMutation({email: 'missing@example.com', password: testPassword}));
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });

      it('throws unauthorized for invalid password', async () => {
        const response = await request(url)
          .post('')
          .send(getLoginUserMutation({email: testUserEmail, password: 'invalidPassword123'}));
        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      });
    });

    describe('updateUser Mutation', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('returns conflict for duplicate field', async () => {
        await UserDAO.create({
          ...createUserInput,
          email: 'duplicate@example.com',
          username: 'duplicate',
        });
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getUpdateUserMutation({userId: createdUser.userId, username: 'duplicate'}));
        expect(response.status).toBe(409);
        await cleanUserByEmail('duplicate@example.com');
      });

      it('returns bad input when invalid phone number is provided', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getUpdateUserMutation({userId: createdUser.userId, phone_number: 'invalid'}));
        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      });

      it('returns unauthorized when updating another user', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getUpdateUserMutation({userId: new Types.ObjectId().toString(), given_name: 'nope'}));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserById Mutation', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('returns unauthenticated for invalid token', async () => {
        const response = await request(url)
          .post('')
          .set('token', 'bad')
          .send(getDeleteUserByIdMutation(createdUser.userId));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when deleting another user', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByIdMutation(new Types.ObjectId().toString()));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByEmail Mutation', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('returns unauthenticated for invalid token', async () => {
        const response = await request(url)
          .post('')
          .set('token', 'bad')
          .send(getDeleteUserByEmailMutation(createdUser.email));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByEmailMutation('another@example.com'));
        expect(response.status).toBe(403);
      });
    });

    describe('deleteUserByUsername Mutation', () => {
      let createdUser: UserWithToken;
      beforeEach(async () => {
        createdUser = await UserDAO.create(createUserInput);
      });

      afterEach(async () => {
        await cleanUserByEmail(testUserEmail);
      });

      it('returns unauthenticated for invalid token', async () => {
        const response = await request(url)
          .post('')
          .set('token', 'bad')
          .send(getDeleteUserByUsernameMutation(createdUser.username));
        expect(response.status).toBe(401);
      });

      it('returns unauthorized when token does not belong to owner', async () => {
        const response = await request(url)
          .post('')
          .set('token', createdUser.token)
          .send(getDeleteUserByUsernameMutation('someoneElse'));
        expect(response.status).toBe(403);
      });
    });
  });
});
