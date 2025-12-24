import request from 'supertest';
import {kebabCase} from 'lodash';
import type {IntegrationServer} from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {EventDAO, EventCategoryDAO, UserDAO} from '@/mongodb/dao';
import {eventsMockData, usersMockData} from '@/mongodb/mockData';
import type {CreateEventInput, UserWithToken, CreateUserInput} from '@ntlango/commons/types';
import {ERROR_MESSAGES} from '@/validation';
import {
  getCreateEventMutation,
  getDeleteEventByIdMutation,
  getDeleteEventBySlugMutation,
  getReadEventByIdQuery,
  getReadEventBySlugQuery,
  getUpdateEventMutation,
} from '@/test/utils';

describe('Event Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5002;
  let testUser: UserWithToken;
  let userInput: CreateUserInput;
  let testEventCategory: any;
  const testEventTitle = 'Test Event Title';
  const testEventSlug = kebabCase(testEventTitle);
  const testEventDescription = 'Test Event Description';

const baseEventData = (() => {
  const {orgIndex, venueIndex, ...rest} = eventsMockData[0];
  return rest;
})();

const createEventOnServer = async () => {
    const response = await request(url)
      .post('')
      .set('token', testUser.token)
      .send(getCreateEventMutation(buildEventInput()));
    return response.body.data.createEvent;
  };

const buildEventInput = (): CreateEventInput => ({
  ...baseEventData,
    title: testEventTitle,
    description: testEventDescription,
    eventCategoryList: [testEventCategory.eventCategoryId],
    organizerList: [testUser.userId],
  });

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    testEventCategory = await EventCategoryDAO.create({
      name: 'IntegrationEventCategory',
      iconName: 'icon',
      description: 'Integration test category',
    });
    userInput = {
      ...usersMockData[0],
      email: 'event@example.com',
      username: 'eventUser',
    };
    testUser = await UserDAO.create(userInput);
  });

  afterAll(async () => {
    await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategory.slug);
    await UserDAO.deleteUserByEmail(testUser.email).catch(() => {});
    await stopIntegrationServer(server);
  });

  afterEach(async () => {
    await EventDAO.deleteEventBySlug(testEventSlug).catch(() => {});
  });

  describe('Positive', () => {
    it('creates a new event with valid input', async () => {
      const response = await request(url)
        .post('')
        .set('token', testUser.token)
        .send(getCreateEventMutation(buildEventInput()));

      expect(response.status).toBe(200);
      const createdEvent = response.body.data.createEvent;
      expect(createdEvent).toHaveProperty('eventId');
      expect(createdEvent.title).toBe(testEventTitle);
    });

    it('reads the event by id and slug after creation', async () => {
      const createResponse = await request(url)
        .post('')
        .set('token', testUser.token)
        .send(getCreateEventMutation(buildEventInput()));

      const createdEvent = createResponse.body.data.createEvent;
      const readById = await request(url).post('').send(getReadEventByIdQuery(createdEvent.eventId));
      expect(readById.status).toBe(200);
      expect(readById.body.data.readEventById.eventId).toBe(createdEvent.eventId);

      const readBySlug = await request(url).post('').send(getReadEventBySlugQuery(createdEvent.slug));
      expect(readBySlug.status).toBe(200);
      expect(readBySlug.body.data.readEventBySlug.slug).toBe(createdEvent.slug);
    });

    describe('updateEvent Mutation', () => {
      it('updates an event when valid input is provided', async () => {
        const createdEvent = await createEventOnServer();
        const updatedTitle = 'Updated Event Title';
        const response = await request(url)
          .post('')
          .set('token', testUser.token)
          .send(getUpdateEventMutation({eventId: createdEvent.eventId, title: updatedTitle}));
        expect(response.status).toBe(200);
        expect(response.body.data.updateEvent.title).toBe(updatedTitle);
      });
    });

    describe('deleteEvent Mutations', () => {
      it('deletes an event by slug', async () => {
        await createEventOnServer();
        const response = await request(url)
          .post('')
          .set('token', testUser.token)
          .send(getDeleteEventBySlugMutation(testEventSlug));
        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventBySlug.slug).toBe(testEventSlug);
      });

      it('deletes an event by id', async () => {
        const createdEvent = await createEventOnServer();
        const response = await request(url)
          .post('')
          .set('token', testUser.token)
          .send(getDeleteEventByIdMutation(createdEvent.eventId));
        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventById.eventId).toBe(createdEvent.eventId);
      });
    });
  });

  describe('Negative', () => {
    it('returns conflict when duplicate event is created', async () => {
      await request(url).post('').set('token', testUser.token).send(getCreateEventMutation(buildEventInput()));
      const response = await request(url)
        .post('')
        .set('token', testUser.token)
        .send(getCreateEventMutation(buildEventInput()));

      expect(response.status).toBe(409);
      expect(response.error).toBeTruthy();
    });

    it('returns validation error when recurrence rule is missing', async () => {
      const input = buildEventInput();
      input.recurrenceRule = '';
      const response = await request(url)
        .post('')
        .set('token', testUser.token)
        .send(getCreateEventMutation(input));

      expect(response.status).toBe(400);
      expect(response.error).toBeTruthy();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns unauthenticated when token missing', async () => {
      const response = await request(url).post('').send(getCreateEventMutation(buildEventInput()));
      expect(response.status).toBe(401);
      expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.UNAUTHENTICATED);
    });

    it('returns unauthenticated when updating without token', async () => {
      const createdEvent = await createEventOnServer();
      const response = await request(url).post('').send(getUpdateEventMutation({eventId: createdEvent.eventId, title: 'No Token'}));
      expect(response.status).toBe(401);
    });

    it('returns unauthenticated when deleting without token', async () => {
      const createdEvent = await createEventOnServer();
      const response = await request(url).post('').send(getDeleteEventBySlugMutation(createdEvent.slug));
      expect(response.status).toBe(401);
    });
  });
});
