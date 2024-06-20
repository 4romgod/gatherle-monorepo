import request from 'supertest';
import {Express} from 'express';
import {ServerContext, createGraphQlServer} from '@/server';
import {ApolloServer} from '@apollo/server';
import {eventsMockData, usersMockData} from '@/mongodb/mockData';
import {API_DOMAIN, GRAPHQL_API_PATH} from '@/constants';
import {Server} from 'http';
import {EventCategoryDAO, EventDAO, UserDAO} from '@/mongodb/dao';
import {CreateEventInputType, EventCategoryType, EventType, UserRole, UserType, UserWithTokenType} from '@/graphql/types';
import {ERROR_MESSAGES} from '@/validation';
import {kebabCase} from 'lodash';
import {getCreateEventMutation} from '@/test/utils';
import {Types} from 'mongoose';
import {generateToken} from '@/utils';

describe('Event Resolver', () => {
    let expressApp: Express;
    let apolloServer: ApolloServer<ServerContext>;
    let httpServer: Server;
    const TEST_PORT = 1000;
    const url = `${API_DOMAIN}:${TEST_PORT}${GRAPHQL_API_PATH}`;
    const testEventTitle = 'Test Event Title';
    const testEventSlug = kebabCase(testEventTitle);
    const testEventDescription = 'Test Event Description';
    let testUser: UserWithTokenType;
    let testEventCategory: EventCategoryType;

    const createEventInput: CreateEventInputType = {
        ...eventsMockData[0],
        title: testEventTitle,
        description: testEventDescription,
    };

    beforeAll(() => {
        console.log('starting event.test.ts');
        const initialSetup = async () => {
            const createServerResults = await createGraphQlServer({port: TEST_PORT});
            expressApp = createServerResults.expressApp;
            apolloServer = createServerResults.apolloServer;
            httpServer = createServerResults.httpServer;

            const user: UserType = {
                ...usersMockData.at(0)!,
                userId: new Types.ObjectId().toString(),
                userRole: UserRole.User,
                email: 'test@example.com',
                username: 'testUser',
            };
            testUser = {
                ...user,
                token: generateToken(user),
            };

            testEventCategory = await EventCategoryDAO.create({
                name: 'TestEventCategory',
                iconName: 'testIcon',
                description: 'This is a test description',
            });
        };
        return initialSetup();
    });

    afterAll(() => {
        const cleanup = async () => {
            apolloServer.stop();
            httpServer.close();

            await EventCategoryDAO.deleteEventCategoryById(testEventCategory.eventCategoryId);
        };
        return cleanup();
    });

    describe('Positive', () => {
        describe('createEvent Mutation', () => {
            afterEach(async () => {
                await EventDAO.deleteEventBySlug(testEventSlug);
            });

            it('should create a new event when valid input is provided', async () => {
                const createEventMutation = getCreateEventMutation({
                    ...createEventInput,
                    organizerList: [testUser.userId],
                    eventCategoryList: [testEventCategory.eventCategoryId],
                });

                const createEventResponse = await request(url).post('').set('token', testUser.token).send(createEventMutation);
                expect(createEventResponse.status).toBe(200);
                expect(createEventResponse.error).toBeFalsy();

                const createdEvent: EventType = createEventResponse.body.data.createEvent;

                expect(createdEvent).toHaveProperty('eventId');
                expect(createdEvent.title).toBe(testEventTitle);
            });
        });
    });

    describe('Negative', () => {
        describe('createEvent Mutation', () => {
            it('should throw CONFLICT error when an event with the same title already exists', async () => {
                await EventDAO.create({
                    ...createEventInput,
                    organizerList: [testUser.userId],
                    eventCategoryList: [testEventCategory.eventCategoryId],
                });

                const createEventMutation = getCreateEventMutation({
                    ...createEventInput,
                    organizerList: [testUser.userId],
                    eventCategoryList: [testEventCategory.eventCategoryId],
                });

                const createEventResponse = await request(url).post('').set('token', testUser.token).send(createEventMutation);
                expect(createEventResponse.status).toBe(409);
                expect(createEventResponse.error).toBeTruthy();

                // Cleanup
                await EventDAO.deleteEventBySlug(testEventSlug);
            });

            it('should throw BAD_USER_INPUT error when invalid input is provided, but the input type schema is valid', async () => {
                const createEventMutation = getCreateEventMutation({
                    ...createEventInput,
                    organizerList: [testUser.userId],
                    eventCategoryList: [testEventCategory.eventCategoryId],
                    startDateTime: 'invalid date',
                });

                const createEventResponse = await request(url).post('').set('token', testUser.token).send(createEventMutation);
                expect(createEventResponse.status).toBe(400);
                expect(createEventResponse.error).toBeTruthy();
                expect(createEventResponse.body.errors[0].message).toBe(`Start date ${ERROR_MESSAGES.INVALID_DATE}`);
            });

            it('should throw BAD_USER_INPUT error when invalid input schema is provided', async () => {
                const createEventMutation = getCreateEventMutation({
                    ...createEventInput,
                    organizerList: undefined,
                    eventCategoryList: [testEventCategory.eventCategoryId],
                });

                const createEventResponse = await request(url).post('').set('token', testUser.token).send(createEventMutation);
                expect(createEventResponse.status).toBe(400);
                expect(createEventResponse.error).toBeTruthy();
                // TODO assert the error message
            });

            it('should throw UNAUTHENTICATED error when auth token is NOT provided', async () => {
                const createEventMutation = getCreateEventMutation({
                    ...createEventInput,
                    organizerList: [testUser.userId],
                    eventCategoryList: [testEventCategory.eventCategoryId],
                });

                const createEventResponse = await request(url).post('').send(createEventMutation);
                expect(createEventResponse.status).toBe(401);
                expect(createEventResponse.error).toBeTruthy();
                expect(createEventResponse.body.errors[0].message).toBe(ERROR_MESSAGES.UNAUTHENTICATED);
            });
        });
    });
});
