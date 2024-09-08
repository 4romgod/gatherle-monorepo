import request from 'supertest';
import {eventsMockData, usersMockData} from '@/mongodb/mockData';
import {CreateEventInputType, EventCategoryType, EventType, UserRole, UserType, UserWithTokenType} from '@/graphql/types';
import {ERROR_MESSAGES} from '@/validation';
import {getCreateEventCategoryMutation, getCreateEventMutation, getDeleteEventCategoryByIdMutation, getDeleteEventBySlugMutation} from '@/test/utils';
import {generateToken} from '@/utils';
import {kebabCase} from 'lodash';
import {Types} from 'mongoose';
import {configDotenv} from 'dotenv';

configDotenv();

describe('Event Resolver', () => {
  const url = `${process.env.GRAPHQL_URL}`;
  const testEventTitle = 'Test Event Title';
  const testEventSlug = kebabCase(testEventTitle);
  const testEventDescription = 'Test Event Description';
  let testUser: UserType;
  let testEventCategory: EventCategoryType;

  const createEventInput: CreateEventInputType = {
    ...eventsMockData[0],
    title: testEventTitle,
    description: testEventDescription,
  };

  testUser = {
    ...usersMockData.at(0)!,
    userId: new Types.ObjectId().toString(),
    userRole: UserRole.Admin,
    email: 'test@example.com',
    username: 'testUser',
  };
  let adminToken: string;

  beforeAll(() => {
    const initialSetup = async () => {
      adminToken = await generateToken(testUser);

      const createEventCategoryMutation = getCreateEventCategoryMutation({
        name: 'TestEventCategory',
        iconName: 'testIcon',
        description: 'This is a test description',
      });
      const createEventCategoryResponse = await request(url).post('').set('token', adminToken).send(createEventCategoryMutation);
      testEventCategory = createEventCategoryResponse.body.data.createEventCategory;
    };
    return initialSetup();
  });

  afterAll(() => {
    const cleanup = async () => {
      const deleteEventCategoryMutation = getDeleteEventCategoryByIdMutation(testEventCategory.eventCategoryId);
      await request(url).post('').set('token', adminToken).send(deleteEventCategoryMutation);
    };
    return cleanup();
  });

  describe('Positive', () => {
    describe('createEvent Mutation', () => {
      afterEach(async () => {
        const deleteEventBySlugMuation = getDeleteEventBySlugMutation(testEventSlug);
        await request(url).post('').set('token', adminToken).send(deleteEventBySlugMuation);
      });

      it('should create a new event when valid input is provided', async () => {
        const createEventMutation = getCreateEventMutation({
          ...createEventInput,
          organizerList: [testUser.userId],
          eventCategoryList: [testEventCategory.eventCategoryId],
        });

        const createEventResponse = await request(url).post('').set('token', adminToken).send(createEventMutation);
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
        const createEventMutation = getCreateEventMutation({
          ...createEventInput,
          organizerList: [testUser.userId],
          eventCategoryList: [testEventCategory.eventCategoryId],
        });
        await request(url).post('').set('token', adminToken).send(createEventMutation);

        const createEventWithConflictMutation = getCreateEventMutation({
          ...createEventInput,
          organizerList: [testUser.userId],
          eventCategoryList: [testEventCategory.eventCategoryId],
        });

        const createEventWithConflictResponse = await request(url).post('').set('token', adminToken).send(createEventWithConflictMutation);
        expect(createEventWithConflictResponse.status).toBe(409);
        expect(createEventWithConflictResponse.error).toBeTruthy();

        // Cleanup
        const deleteEventBySlugMuation = getDeleteEventBySlugMutation(testEventSlug);
        await request(url).post('').set('token', adminToken).send(deleteEventBySlugMuation);
      });

      it('should throw BAD_USER_INPUT error when invalid input is provided, but the input type schema is valid', async () => {
        const createEventMutation = getCreateEventMutation({
          ...createEventInput,
          organizerList: [testUser.userId],
          eventCategoryList: [],
        });

        const createEventResponse = await request(url).post('').set('token', adminToken).send(createEventMutation);
        expect(createEventResponse.status).toBe(400);
        expect(createEventResponse.error).toBeTruthy();
        expect(createEventResponse.body.errors[0].message).toBe('Atleast one event category is required');
      });

      it('should throw BAD_USER_INPUT error when invalid input schema is provided', async () => {
        const createEventMutation = getCreateEventMutation({
          ...createEventInput,
          organizerList: undefined,
          eventCategoryList: [testEventCategory.eventCategoryId],
        });

        const createEventResponse = await request(url).post('').set('token', adminToken).send(createEventMutation);
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
