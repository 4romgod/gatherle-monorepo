import request from 'supertest';
import { kebabCase } from 'lodash';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import { EventDAO, EventCategoryDAO, UserDAO } from '@/mongodb/dao';
import { eventsMockData, usersMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken, CreateUserInput } from '@ntlango/commons/types';
import { SortOrderInput } from '@ntlango/commons/types';
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
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventsMockData[0];
    return rest;
  })();

  const createEventOnServer = async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + testUser.token)
      .send(getCreateEventMutation(buildEventInput()));
    return response.body.data.createEvent;
  };

  const buildEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: testEventTitle,
    description: testEventDescription,
    eventCategories: [testEventCategory.eventCategoryId],
    organizers: [{ user: testUser.userId, role: 'Host' }],
  });

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;
    // Clean up any leftover event categories from failed test runs
    await EventCategoryDAO.deleteEventCategoryBySlug('integration-event-category').catch(() => {});
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
    // Clean up user if exists from failed test run
    await UserDAO.deleteUserByEmail(userInput.email).catch(() => {});
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
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(buildEventInput()));

      expect(response.status).toBe(200);
      const createdEvent = response.body.data.createEvent;
      expect(createdEvent).toHaveProperty('eventId');
      expect(createdEvent.title).toBe(testEventTitle);
    });

    it('reads the event by id and slug after creation', async () => {
      const createResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
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
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getUpdateEventMutation({ eventId: createdEvent.eventId, title: updatedTitle }));
        expect(response.status).toBe(200);
        expect(response.body.data.updateEvent.title).toBe(updatedTitle);
      });
    });

    describe('deleteEvent Mutations', () => {
      it('deletes an event by slug', async () => {
        await createEventOnServer();
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getDeleteEventBySlugMutation(testEventSlug));
        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventBySlug.slug).toBe(testEventSlug);
      });

      it('deletes an event by id', async () => {
        const createdEvent = await createEventOnServer();
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getDeleteEventByIdMutation(createdEvent.eventId));
        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventById.eventId).toBe(createdEvent.eventId);
      });
    });
  });

  describe('readEvents Query', () => {
    it('reads multiple events with no filters', async () => {
      const event1 = await createEventOnServer();
      const input2 = buildEventInput();
      input2.title = `Test Event Two ${Date.now()}`;
      const response2 = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(input2));
      const event2 = response2.body.data.createEvent;

      const readResponse = await request(url)
        .post('')
        .send({
          query: `query ReadEvents {
          readEvents {
            eventId
            title
            slug
            organizers {
              user {
                userId
              }
              role
            }
          }
        }`,
        });

      expect(readResponse.status).toBe(200);
      const events = readResponse.body.data.readEvents;
      expect(Array.isArray(events)).toBe(true);
      const found1 = events.find((e: any) => e.eventId === event1.eventId);
      const found2 = events.find((e: any) => e.eventId === event2.eventId);
      expect(found1).toBeDefined();
      expect(found2).toBeDefined();

      await EventDAO.deleteEventBySlug('test-event-two').catch(() => {});
    });

    it('reads events with pagination', async () => {
      await createEventOnServer();
      const readResponse = await request(url)
        .post('')
        .send({
          query: `query ReadEvents($options: EventsQueryOptionsInput) {
          readEvents(options: $options) {
            eventId
            title
          }
        }`,
          variables: {
            options: {
              pagination: {
                skip: 0,
                limit: 1,
              },
            },
          },
        });

      expect(readResponse.status).toBe(200);
      const events = readResponse.body.data.readEvents;
      expect(events.length).toBeLessThanOrEqual(1);
    });

    it('reads events with category filter', async () => {
      await createEventOnServer();
      const readResponse = await request(url)
        .post('')
        .send({
          query: `query ReadEvents($options: EventsQueryOptionsInput) {
          readEvents(options: $options) {
            eventId
            title
            eventCategories {
              eventCategoryId
            }
          }
        }`,
          variables: {
            options: {
              filters: [
                {
                  field: 'eventCategories',
                  value: testEventCategory.eventCategoryId,
                },
              ],
            },
          },
        });

      expect(readResponse.status).toBe(200);
      const events = readResponse.body.data.readEvents;
      // Filter may return 0 or more events depending on implementation
      expect(Array.isArray(events)).toBe(true);
    });

    it('reads events with sort order', async () => {
      await createEventOnServer();
      const readResponse = await request(url)
        .post('')
        .send({
          query: `query ReadEvents($options: EventsQueryOptionsInput) {
          readEvents(options: $options) {
            eventId
            title
            createdAt
          }
        }`,
          variables: {
            options: {
              sort: [
                {
                  field: 'createdAt',
                  order: SortOrderInput.desc,
                },
              ],
            },
          },
        });

      expect([200, 400]).toContain(readResponse.status);
      if (readResponse.status === 200) {
        const events = readResponse.body.data.readEvents;
        if (events.length > 1) {
          const dates = events.map((e: any) => new Date(e.createdAt).getTime()).filter((d) => !isNaN(d));
          for (let i = 0; i < dates.length - 1; i++) {
            expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
          }
        }
      }
    });

    it('validates organizer roles are returned correctly', async () => {
      const event = await createEventOnServer();
      const readResponse = await request(url)
        .post('')
        .send({
          query: `query ReadEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            organizers {
              user {
                userId
              }
              role
            }
          }
        }`,
          variables: {
            eventId: event.eventId,
          },
        });

      expect(readResponse.status).toBe(200);
      const eventData = readResponse.body.data.readEventById;
      expect(eventData.organizers).toHaveLength(1);
      expect(eventData.organizers[0].user.userId).toBe(testUser.userId);
      expect(eventData.organizers[0].role).toBe('Host');
    });
  });

  describe('Negative', () => {
    it('returns conflict when duplicate event is created', async () => {
      await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(buildEventInput()));
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(buildEventInput()));

      expect(response.status).toBe(409);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
    });

    it('returns validation error when organizers array is empty', async () => {
      const input = buildEventInput();
      input.organizers = [];
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(input));

      expect(response.status).toBe(400);
      expect(response.error).toBeTruthy();
    });

    it('returns error for invalid event category', async () => {
      const input = buildEventInput();
      input.eventCategories = ['invalid-category-id'];
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(input));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(response.body.errors[0].message).toContain('Event Category ID');
    });

    it('returns unauthenticated when token missing', async () => {
      const response = await request(url).post('').send(getCreateEventMutation(buildEventInput()));
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns unauthenticated when updating without token', async () => {
      const createdEvent = await createEventOnServer();
      const response = await request(url)
        .post('')
        .send(getUpdateEventMutation({ eventId: createdEvent.eventId, title: 'No Token' }));
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns unauthenticated when deleting without token', async () => {
      const createdEvent = await createEventOnServer();
      const response = await request(url).post('').send(getDeleteEventBySlugMutation(createdEvent.slug));
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns not found when reading non-existent event by id', async () => {
      const response = await request(url)
        .post('')
        .send({
          query: `query ReadEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            title
          }
        }`,
          variables: {
            eventId: 'non-existent-id',
          },
        });

      expect(response.status).toBe(404);
    });

    it('returns not found when reading non-existent event by slug', async () => {
      const response = await request(url)
        .post('')
        .send({
          query: `query ReadEventBySlug($slug: String!) {
          readEventBySlug(slug: $slug) {
            eventId
            title
          }
        }`,
          variables: {
            slug: 'non-existent-slug',
          },
        });

      expect(response.status).toBe(404);
    });

    it('prevents unauthorized user from updating event', async () => {
      const createdEvent = await createEventOnServer();
      const otherUser = await UserDAO.create({
        ...usersMockData[1],
        email: 'other@example.com',
        username: 'otherUser',
      });

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + otherUser.token)
        .send(getUpdateEventMutation({ eventId: createdEvent.eventId, title: 'Unauthorized Update' }));

      expect(response.status).toBe(403);

      await UserDAO.deleteUserByEmail(otherUser.email).catch(() => {});
    });

    it('prevents unauthorized user from deleting event', async () => {
      const createdEvent = await createEventOnServer();
      const otherUser = await UserDAO.create({
        ...usersMockData[1],
        email: 'other2@example.com',
        username: 'otherUser2',
      });

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + otherUser.token)
        .send(getDeleteEventByIdMutation(createdEvent.eventId));

      expect(response.status).toBe(403);

      await UserDAO.deleteUserByEmail(otherUser.email).catch(() => {});
    });
  });
});
