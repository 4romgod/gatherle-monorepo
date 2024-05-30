import {Express} from 'express';
import {ServerContext, createGraphQlServer} from '@/server';
import {ApolloServer} from '@apollo/server';
import request from 'supertest';
import {usersMockData} from '@/mongodb/mockData';
import {API_DOMAIN, API_PATH} from '@/constants';
import {Server} from 'http';
import {getCreateUserMutation, getLoginUserMutation, getUpdateUserMutation} from '@/utils';
import {UserDAO} from '@/mongodb/dao';
import {CreateUserInputType, UserType, UserWithTokenType} from '@/graphql/types';
import {ERROR_MESSAGES} from '@/utils/validators';
import {verifyToken} from '@/utils/auth';

describe('User Resolver', () => {
    let expressApp: Express;
    let apolloServer: ApolloServer<ServerContext>;
    let httpServer: Server;
    const TEST_PORT = 1000;
    const url = `${API_DOMAIN}:${TEST_PORT}${API_PATH}`;
    const testUserEmail = 'test@example.com';
    const testUsername = 'testUsername';
    const testPassword = 'testPassword';

    const createUserInput: CreateUserInputType = {
        ...usersMockData.at(0)!,
        email: testUserEmail,
        username: testUsername,
        password: testPassword,
    };

    beforeAll(() => {
        const initializeServer = async () => {
            const createServerResults = await createGraphQlServer({port: TEST_PORT});
            expressApp = createServerResults.expressApp;
            apolloServer = createServerResults.apolloServer;
            httpServer = createServerResults.httpServer;
        };
        return initializeServer();
    });

    afterAll(() => {
        const terminateServer = async () => {
            apolloServer.stop();
            httpServer.close();
        };
        return terminateServer();
    });

    describe('Positive', () => {
        describe('createUser Mutation', () => {
            afterEach(async () => {
                await UserDAO.deleteUserByEmail(testUserEmail);
            });

            it('should create new user when valid input is provided', async () => {
                const createUserMutation = getCreateUserMutation(createUserInput);

                const createUserResponse = await request(url).post('').send(createUserMutation);
                expect(createUserResponse.status).toBe(200);
                expect(createUserResponse.error).toBeFalsy();

                const createdUser = createUserResponse.body.data.createUser;

                expect(createdUser).toHaveProperty('id');
                expect(createdUser.email).toBe(testUserEmail);
            });
        });

        describe('updateUser Mutation', () => {
            const updatedEmail = 'updated@email.com';
            let createdUser: UserWithTokenType;

            beforeEach(async () => {
                createdUser = await UserDAO.create(createUserInput);
            });

            afterEach(async () => {
                await UserDAO.deleteUserByEmail(updatedEmail);
            });

            it('should update a user when valid input is provided', async () => {
                const updateUserMutation = getUpdateUserMutation({
                    ...createUserInput,
                    id: createdUser.id,
                    email: updatedEmail,
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.status).toBe(200);
                expect(updateUserResponse.error).toBeFalsy();

                const updatedUser = updateUserResponse.body.data.updateUser;

                expect(updatedUser).toHaveProperty('id');
                expect(updatedUser.email).toBe(updatedEmail);
            });
        });

        describe('loginUser Mutation', () => {
            let createdUser: UserWithTokenType;
            beforeEach(async () => {
                createdUser = await UserDAO.create(createUserInput);
            });

            afterEach(async () => {
                await UserDAO.deleteUserByEmail(testUserEmail);
            });

            it('should login a user when valid input is provided', async () => {
                const loginUserMutation = getLoginUserMutation({
                    email: testUserEmail,
                    password: testPassword,
                });
                const loginUserResponse = await request(url).post('').send(loginUserMutation);
                expect(loginUserResponse.status).toBe(200);
                expect(loginUserResponse.error).toBeFalsy();

                const tokenData = loginUserResponse.body.data.loginUser.token;
                const decodedUser = verifyToken(tokenData) as UserType;
                expect(decodedUser.id).toBe(createdUser.id);
            });
        });
    });

    describe('Negative', () => {
        describe('createUser Mutation', () => {
            /**
             * Tests variations
             * 1. user creates runs into conflicts with other existing items
             * 2. user enters correct schema, but invalid values (handled by zod schema)
             * 3. user enters incorrect input schema (e.g. leaves out a required attribute)
             */
            it('should throw CONFLICT error when unique attribute already exists', async () => {
                const createUserMutation = getCreateUserMutation(createUserInput);

                const createUserResponse = await request(url).post('').send(createUserMutation);
                expect(createUserResponse.status).toBe(200);
                expect(createUserResponse.error).toBeFalsy();

                const createAnotherUserResponse = await request(url).post('').send(createUserMutation);
                expect(createAnotherUserResponse.error).toBeTruthy();
                expect(createAnotherUserResponse.status).toBe(409);

                // cleanup
                await UserDAO.deleteUserByEmail(testUserEmail);
            });

            it('should throw BAD_USER_INPUT error when invalid input is provided, but the input type schema is valid', async () => {
                const invalidPhoneNumber = 'mockPhoneNumber';
                const createUserMutation = getCreateUserMutation({
                    ...createUserInput,
                    phone_number: invalidPhoneNumber,
                });

                const createUserResponse = await request(url).post('').send(createUserMutation);
                expect(createUserResponse.error).toBeTruthy();
                expect(createUserResponse.status).toBe(400);
                expect(createUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
            });

            it('should throw error when invalid input schema is provided', async () => {
                const invalidCreateUserMutation = getCreateUserMutation({
                    ...createUserInput,
                    email: null,
                });

                const createUserResponse = await request(url).post('').send(invalidCreateUserMutation);
                expect(createUserResponse.error).toBeTruthy();
                expect(createUserResponse.status).toBe(400);
                expect(createUserResponse.status).toBe(400);
            });
        });

        /**
         * Tests variations
         * 1. user updates runs into conflicts with other existing items XX
         * 2. user enters correct schema, but invalid values (handled by zod schema) XX
         * 3. user enters correct schema, but id does not exist (gets a 404) XX
         * 4. user enters correct schema, but id is invalid (gets a 404) XX
         * 5. user enters incorrect input schema (e.g. adds a non existing attribute attribute) XX
         *
         */
        describe('updateUser Mutation', () => {
            let createdUser: UserWithTokenType;
            beforeEach(async () => {
                createdUser = await UserDAO.create(createUserInput);
            });

            afterEach(async () => {
                await UserDAO.deleteUserByEmail(testUserEmail);
            });

            it('should throw CONFLICT error when unique attribute already exists', async () => {
                const anotherUsername = 'updatedUser';
                try {
                    await UserDAO.create({...createUserInput, email: 'updated@email.net', username: anotherUsername}); // another user for conflict
                } catch (error) {
                    console.log(error);
                    fail('it should not reach here');
                }

                const updateUserMutation = getUpdateUserMutation({
                    id: createdUser.id,
                    username: anotherUsername,
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.error).toBeTruthy();
                expect(updateUserResponse.status).toBe(409);

                await UserDAO.deleteUserByEmail('updated@email.net');
            });

            it('should throw BAD_USER_INPUT error when invalid input is provided, but the input type schema is valid', async () => {
                const invalidPhoneNumber = 'mockPhoneNumber';
                const updateUserMutation = getUpdateUserMutation({
                    id: createdUser.id,
                    phone_number: invalidPhoneNumber,
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.error).toBeTruthy();
                expect(updateUserResponse.status).toBe(400);
                expect(updateUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
            });

            it('should throw UNAUTHORIZED error when valid input is provided, but the user is updating another user', async () => {
                const mockId = '62a23958e5a9e9b88f853a67';
                const updateUserMutation = getUpdateUserMutation({
                    id: mockId,
                    given_name: 'updatedName',
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.error).toBeTruthy();
                expect(updateUserResponse.status).toBe(403);
                expect(updateUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.UNAUTHORIZED);
            });

            it('should throw UNAUTHORIZED error even when an invalid mongodb id is entered', async () => {
                const mockId = 'mockId';
                const updateUserMutation = getUpdateUserMutation({
                    id: mockId,
                    given_name: 'updatedName',
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.error).toBeTruthy();
                expect(updateUserResponse.status).toBe(403);
                expect(updateUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.UNAUTHORIZED);
            });

            it('should throw BAD_USER_INPUT error when invalid input type is provided', async () => {
                const updateUserMutation = getUpdateUserMutation({
                    id: createdUser.id,
                    non_existing_param: 'mockParam',
                });

                const updateUserResponse = await request(url).post('').set('token', createdUser.token).send(updateUserMutation);
                expect(updateUserResponse.error).toBeTruthy();
                expect(updateUserResponse.status).toBe(400);
                expect(updateUserResponse.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
            });
        });

        describe('loginUser Mutation', () => {
            beforeEach(async () => {
                await UserDAO.create(createUserInput);
            });

            afterEach(async () => {
                await UserDAO.deleteUserByEmail(testUserEmail);
            });

            it('should throw UNAUTHORIZED error when invalid email is provided', async () => {
                const fakeEmail = 'invalid_email@example.com';
                const invalidLoginMutation = getLoginUserMutation({
                    email: fakeEmail,
                    password: testPassword,
                });

                const loginUserResponse = await request(url).post('').send(invalidLoginMutation);
                expect(loginUserResponse.status).toBe(401);
                expect(loginUserResponse.error).toBeTruthy();
                expect(loginUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISSMATCH);
            });

            it('should throw UNAUTHORIZED error when invalid password is provided', async () => {
                const invalidLoginMutation = getLoginUserMutation({
                    email: testUserEmail,
                    password: 'incorrect_password',
                });

                const loginUserResponse = await request(url).post('').send(invalidLoginMutation);
                expect(loginUserResponse.status).toBe(401);
                expect(loginUserResponse.error).toBeTruthy();
                expect(loginUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISSMATCH);
            });

            it('should throw BAD_REQUEST error when empty email or password is provided', async () => {
                const emptyEmailLoginMutation = getLoginUserMutation({
                    email: '',
                    password: testPassword,
                });

                let loginUserResponse = await request(url).post('').send(emptyEmailLoginMutation);
                expect(loginUserResponse.status).toBe(400);
                expect(loginUserResponse.error).toBeTruthy();
                expect(loginUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_EMAIL);

                const emptyPasswordLoginMutation = getLoginUserMutation({
                    email: testUserEmail,
                    password: '',
                });

                loginUserResponse = await request(url).post('').send(emptyPasswordLoginMutation);
                expect(loginUserResponse.status).toBe(400);
                expect(loginUserResponse.error).toBeTruthy();
                expect(loginUserResponse.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PASSWORD);
            });
        });
    });
});
