import request from 'supertest';
import {Express} from 'express';
import {ServerContext, createGraphQlServer} from '@/server';
import {ApolloServer} from '@apollo/server';
import {usersMockData} from '@/mongodb/mockData';
import {API_DOMAIN, GRAPHQL_API_PATH} from '@/constants';
import {Server} from 'http';
import {
    getCreateEventCategoryMutation,
    getUpdateEventCategoryMutation,
    getDeleteEventCategoryByIdMutation,
    getReadEventCategoryByIdQuery,
    getReadEventCategoryBySlugQuery,
    getReadEventCategoriesQuery,
    getReadEventCategoriesWithOptionsQuery,
    getDeleteEventCategoryBySlugMutation,
} from '@/test/utils';
import {EventCategoryDAO} from '@/mongodb/dao';
import {CreateEventCategoryInputType, QueryOptionsInput, UserRole, UserType, UserWithTokenType} from '@/graphql/types';
import {generateToken} from '@/utils/auth';
import {Types} from 'mongoose';
import {kebabCase} from 'lodash';

describe('EventCategory Resolver', () => {
    let expressApp: Express;
    let apolloServer: ApolloServer<ServerContext>;
    let httpServer: Server;
    const TEST_PORT = 1000;
    const url = `${API_DOMAIN}:${TEST_PORT}${GRAPHQL_API_PATH}`;
    let testUser: UserWithTokenType;
    const testEventCategorySlug = kebabCase('testEventCategory');

    const createEventCategoryInput: CreateEventCategoryInputType = {
        name: 'testEventCategory',
        description: 'Test Event Category',
        iconName: 'testIcon',
        color: 'testColor',
    };

    beforeAll(() => {
        console.log('starting eventCategory.test.ts');
        const initialSetup = async () => {
            const createServerResults = await createGraphQlServer({port: TEST_PORT});
            expressApp = createServerResults.expressApp;
            apolloServer = createServerResults.apolloServer;
            httpServer = createServerResults.httpServer;

            const user: UserType = {
                ...usersMockData.at(0)!,
                userId: new Types.ObjectId().toString(),
                userRole: UserRole.Admin,
                email: 'test@example.com',
                username: 'testUser',
            };
            const token = generateToken(user);
            testUser = {
                ...user,
                token,
            };
        };
        return initialSetup();
    });

    afterAll(() => {
        const cleanup = async () => {
            apolloServer.stop();
            httpServer.close();
        };
        return cleanup();
    });

    describe('Positive', () => {
        describe('createEventCategory', () => {
            afterEach(async () => {
                await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
            });

            it('should create a new event category', async () => {
                const createEventCategoryMutation = getCreateEventCategoryMutation(createEventCategoryInput);
                const createEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(createEventCategoryMutation);

                expect(createEventCategoryResponse.status).toBe(200);
                expect(createEventCategoryResponse.error).toBeFalsy();

                const createdEventCategory = createEventCategoryResponse.body.data.createEventCategory;

                expect(createdEventCategory).toHaveProperty('eventCategoryId');
                expect(createdEventCategory.name).toBe(createEventCategoryInput.name);
            });
        });

        describe('updateEventCategory', () => {
            afterEach(async () => {
                await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
            });

            it('should update an event category', async () => {
                const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);

                const updateEventCategoryMutation = getUpdateEventCategoryMutation({
                    iconName: 'updatedIcon',
                    eventCategoryId: createdCategory.eventCategoryId,
                });

                const updateEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(updateEventCategoryMutation);

                expect(updateEventCategoryResponse.status).toBe(200);
                expect(updateEventCategoryResponse.error).toBeFalsy();

                const updatedEventCategory = updateEventCategoryResponse.body.data.updateEventCategory;

                expect(updatedEventCategory).toHaveProperty('eventCategoryId');
                expect(updatedEventCategory.iconName).toBe('updatedIcon');
            });
        });

        describe('deleteEventCategoryById', () => {
            it('should delete an event category by its ID', async () => {
                const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);

                const deleteEventCategoryMutation = getDeleteEventCategoryByIdMutation(createdCategory.eventCategoryId);

                const deletedEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(deleteEventCategoryMutation);

                expect(deletedEventCategoryResponse.status).toBe(200);
                expect(deletedEventCategoryResponse.error).toBeFalsy();

                const deletedEventCategory = deletedEventCategoryResponse.body.data.deleteEventCategoryById;

                expect(deletedEventCategory).toHaveProperty('eventCategoryId');
                expect(deletedEventCategory.slug).toBe(testEventCategorySlug);
            });
        });

        describe('deleteEventCategoryBySlug', () => {
            it('should delete an event category by its Slug', async () => {
                const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);

                const deleteEventCategoryMutation = getDeleteEventCategoryBySlugMutation(createdCategory.slug);

                const deletedEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(deleteEventCategoryMutation);

                expect(deletedEventCategoryResponse.status).toBe(200);
                expect(deletedEventCategoryResponse.error).toBeFalsy();

                const deletedEventCategory = deletedEventCategoryResponse.body.data.deleteEventCategoryBySlug;

                expect(deletedEventCategory).toHaveProperty('eventCategoryId');
                expect(deletedEventCategory.slug).toBe(testEventCategorySlug);
            });
        });

        describe('readEventCategoryById', () => {
            afterEach(async () => {
                await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
            });

            it('should read an event category by it ID', async () => {
                const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);

                const readEventCategoryMutation = getReadEventCategoryByIdQuery(createdCategory.eventCategoryId);

                const readEventCategoryResponse = await request(url).post('').set('token', '').send(readEventCategoryMutation);

                expect(readEventCategoryResponse.status).toBe(200);
                expect(readEventCategoryResponse.error).toBeFalsy();

                const readEventCategory = readEventCategoryResponse.body.data.readEventCategoryById;

                expect(readEventCategory).toHaveProperty('eventCategoryId');
                expect(readEventCategory.slug).toBe(testEventCategorySlug);
            });
        });

        describe('readEventCategoryBySlug', () => {
            afterEach(async () => {
                await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
            });

            it('should read an event category by slug', async () => {
                const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);

                const readEventCategoryMutation = getReadEventCategoryBySlugQuery(createdCategory.slug);

                const readEventCategoryResponse = await request(url).post('').set('token', '').send(readEventCategoryMutation);

                expect(readEventCategoryResponse.status).toBe(200);
                expect(readEventCategoryResponse.error).toBeFalsy();

                const readEventCategory = readEventCategoryResponse.body.data.readEventCategoryBySlug;

                expect(readEventCategory).toHaveProperty('eventCategoryId');
                expect(readEventCategory.slug).toBe(testEventCategorySlug);
            });
        });

        describe('readEventCategories', () => {
            afterEach(async () => {
                await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
            });

            it('should read all event categories', async () => {
                await EventCategoryDAO.create(createEventCategoryInput);

                const readEventCategoriesMutation = getReadEventCategoriesQuery();

                const readEventCategoriesResponse = await request(url).post('').set('token', '').send(readEventCategoriesMutation);

                expect(readEventCategoriesResponse.status).toBe(200);
                expect(readEventCategoriesResponse.error).toBeFalsy();

                const readEventCategories = readEventCategoriesResponse.body.data.readEventCategories;

                expect(readEventCategories.length).toBeGreaterThan(0);

                const ourTestCategory = readEventCategories.find((category: any) => category.slug == testEventCategorySlug);

                expect(ourTestCategory).toBeDefined();
                expect(ourTestCategory.slug).toBe(testEventCategorySlug);
            });

            it('should read empty event categories with wrong options', async () => {
                await EventCategoryDAO.create(createEventCategoryInput);

                const options: QueryOptionsInput = {filters: [{field: 'name', value: 'non-existing'}]};
                const readEventCategoriesMutation = getReadEventCategoriesWithOptionsQuery(options);
                const readEventCategoriesResponse = await request(url).post('').set('token', '').send(readEventCategoriesMutation);

                expect(readEventCategoriesResponse.status).toBe(200);
                expect(readEventCategoriesResponse.error).toBeFalsy();
                const readEventCategories = readEventCategoriesResponse.body.data.readEventCategories;

                expect(readEventCategoriesResponse.status).toBe(200);
                expect(readEventCategoriesResponse.error).toBeFalsy();
                expect(readEventCategories.length).toEqual(0);
            });

            it('should read event categories with options', async () => {
                await EventCategoryDAO.create(createEventCategoryInput);

                const options: QueryOptionsInput = {filters: [{field: 'name', value: createEventCategoryInput.name}]};
                const readEventCategoriesMutation = getReadEventCategoriesWithOptionsQuery(options);
                const readEventCategoriesResponse = await request(url).post('').set('token', '').send(readEventCategoriesMutation);

                expect(readEventCategoriesResponse.status).toBe(200);
                expect(readEventCategoriesResponse.error).toBeFalsy();

                const readEventCategories = readEventCategoriesResponse.body.data.readEventCategories;

                expect(readEventCategories.length).toBeGreaterThan(0);

                const ourTestCategory = readEventCategories.find((category: any) => category.slug == testEventCategorySlug);

                expect(ourTestCategory).toBeDefined();
                expect(ourTestCategory.slug).toBe(testEventCategorySlug);
            });
        });
    });

    describe('Negative', () => {
        describe('createEventCategory', () => {
            it('should get UNAUTHENTICATED Error when creating a new event category without auth', async () => {
                const createEventCategoryMutation = getCreateEventCategoryMutation(createEventCategoryInput);
                const createEventCategoryResponse = await request(url).post('').send(createEventCategoryMutation);

                expect(createEventCategoryResponse.status).toBe(401);
                expect(createEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHORIZED Error when creating a new event category without ADMIN auth', async () => {
                const user: UserType = {
                    ...usersMockData.at(0)!,
                    userId: new Types.ObjectId().toString(),
                    userRole: UserRole.User,
                    email: 'test@example.com',
                    username: 'testUser',
                };
                const token = generateToken(user);

                const createEventCategoryMutation = getCreateEventCategoryMutation(createEventCategoryInput);
                const createEventCategoryResponse = await request(url).post('').set('token', token).send(createEventCategoryMutation);

                expect(createEventCategoryResponse.status).toBe(403);
                expect(createEventCategoryResponse.error).toBeTruthy();
            });
        });

        describe('updateEventCategory', () => {
            it('should get NOT_FOUND updating a non-existent event category', async () => {
                const updateEventCategoryMutation = getUpdateEventCategoryMutation({
                    iconName: 'updatedIcon',
                    eventCategoryId: new Types.ObjectId().toString(),
                });

                const updateEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(updateEventCategoryMutation);
                expect(updateEventCategoryResponse.status).toBe(404);
                expect(updateEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHENTICATED Error when updating an event category without auth', async () => {
                const updateEventCategoryMutation = getUpdateEventCategoryMutation({
                    iconName: 'updatedIcon',
                    eventCategoryId: new Types.ObjectId().toString(),
                });

                const updateEventCategoryResponse = await request(url).post('').send(updateEventCategoryMutation);
                expect(updateEventCategoryResponse.status).toBe(401);
                expect(updateEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHORIZED Error when creating an event category without ADMIN auth', async () => {
                const user: UserType = {
                    ...usersMockData.at(0)!,
                    userId: new Types.ObjectId().toString(),
                    userRole: UserRole.User,
                    email: 'test@example.com',
                    username: 'testUser',
                };
                const token = generateToken(user);

                const updateEventCategoryMutation = getUpdateEventCategoryMutation({
                    iconName: 'updatedIcon',
                    eventCategoryId: new Types.ObjectId().toString(),
                });

                const updateEventCategoryResponse = await request(url).post('').set('token', token).send(updateEventCategoryMutation);
                expect(updateEventCategoryResponse.status).toBe(403);
                expect(updateEventCategoryResponse.error).toBeTruthy();
            });
        });

        describe('deleteEventCategoryById', () => {
            it('should get NOT_FOUND deleting a non-existent event category', async () => {
                const deleteEventCategoryMutation = getDeleteEventCategoryByIdMutation(new Types.ObjectId().toString());

                const deleteEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(404);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHENTICATED Error when deleting an event category without auth', async () => {
                const deleteEventCategoryMutation = getDeleteEventCategoryByIdMutation(new Types.ObjectId().toString());

                const deleteEventCategoryResponse = await request(url).post('').send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(401);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHORIZED Error when deleting an event category without ADMIN auth', async () => {
                const user: UserType = {
                    ...usersMockData.at(0)!,
                    userId: new Types.ObjectId().toString(),
                    userRole: UserRole.User,
                    email: 'test@example.com',
                    username: 'testUser',
                };
                const token = generateToken(user);

                const deleteEventCategoryMutation = getDeleteEventCategoryByIdMutation(new Types.ObjectId().toString());

                const deleteEventCategoryResponse = await request(url).post('').set('token', token).send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(403);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });
        });

        describe('deleteEventCategoryBySlug', () => {
            it('should get NOT_FOUND deleting a non-existent event category', async () => {
                const deleteEventCategoryMutation = getDeleteEventCategoryBySlugMutation('non-existing');

                const deleteEventCategoryResponse = await request(url).post('').set('token', testUser.token).send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(404);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHENTICATED Error when deleting an event category without auth', async () => {
                const deleteEventCategoryMutation = getDeleteEventCategoryBySlugMutation('existing');

                const deleteEventCategoryResponse = await request(url).post('').send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(401);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });

            it('should get UNAUTHORIZED Error when deleting an event category without ADMIN auth', async () => {
                const user: UserType = {
                    ...usersMockData.at(0)!,
                    userId: new Types.ObjectId().toString(),
                    userRole: UserRole.User,
                    email: 'test@example.com',
                    username: 'testUser',
                };
                const token = generateToken(user);

                const deleteEventCategoryMutation = getDeleteEventCategoryBySlugMutation(new Types.ObjectId().toString());

                const deleteEventCategoryResponse = await request(url).post('').set('token', token).send(deleteEventCategoryMutation);
                expect(deleteEventCategoryResponse.status).toBe(403);
                expect(deleteEventCategoryResponse.error).toBeTruthy();
            });
        });

        describe('readEventCategoryById', () => {
            it('should NOT_FOUND reading a non-existent event category by ID', async () => {
                const readEventCategoryMutation = getReadEventCategoryByIdQuery('non-existing');

                const readEventCategoryResponse = await request(url).post('').send(readEventCategoryMutation);
                expect(readEventCategoryResponse.status).toBe(404);
                expect(readEventCategoryResponse.error).toBeTruthy();
            });
        });

        describe('readEventCategoryBySlug', () => {
            it('should NOT_FOUND when reading a non-existent event category by slug', async () => {
                const readEventCategoryMutation = getReadEventCategoryBySlugQuery('non-existing');

                const readEventCategoryResponse = await request(url).post('').send(readEventCategoryMutation);
                expect(readEventCategoryResponse.status).toBe(404);
                expect(readEventCategoryResponse.error).toBeTruthy();
            });
        });
    });
});
