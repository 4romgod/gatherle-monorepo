import request from 'supertest';
import { kebabCase } from 'lodash';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import { eventsMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@ntlango/commons/types';
import { SortOrderInput, OrganizationRole } from '@ntlango/commons/types';
import {
  getCreateEventMutation,
  getDeleteEventByIdMutation,
  getDeleteEventBySlugMutation,
  getReadEventByIdQuery,
  getReadEventBySlugQuery,
  getUpdateEventMutation,
  getDeleteOrganizationByIdMutation,
  getDeleteOrganizationMembershipMutation,
} from '@/test/utils';
import {
  getSeededTestUsers,
  loginSeededUser,
  readFirstEventCategory,
  type EventCategoryRef,
} from '@/test/integration/utils/helpers';
import {
  createEventOnServer,
  createMembershipOnServer,
  createOrganizationOnServer,
  untrackCreatedId,
  updateMembershipRoleOnServer,
} from '@/test/integration/utils/eventResolverHelpers';

describe('Event Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5002;
  let adminUser: UserWithToken;
  let testUser: UserWithToken;
  let testUser2: UserWithToken;
  let testEventCategory: EventCategoryRef;
  const testRunId = Date.now();
  const testEventTitle = `Test Event Title ${testRunId}`;
  const testEventSlug = kebabCase(testEventTitle);
  const testEventDescription = 'Test Event Description';
  const createdEventIds: string[] = [];
  const createdOrgIds: string[] = [];
  const createdMembershipIds: string[] = [];
  const randomId = () => Math.random().toString(36).slice(2, 7);

  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventsMockData[0];
    return rest;
  })();

  const buildEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: testEventTitle,
    description: testEventDescription,
    eventCategories: [testEventCategory.eventCategoryId],
    organizers: [{ user: testUser.userId, role: 'Host' }],
  });

  const createEvent = (input: CreateEventInput = buildEventInput()) =>
    createEventOnServer(url, testUser.token, input, createdEventIds);

  const createOrganization = (name: string) =>
    createOrganizationOnServer(url, adminUser.token, adminUser.userId, name, createdOrgIds);

  const createMembership = (orgId: string, userId: string, role: OrganizationRole) =>
    createMembershipOnServer(url, adminUser.token, orgId, userId, role, createdMembershipIds);

  const updateMembershipRole = (membershipId: string, role: OrganizationRole) =>
    updateMembershipRoleOnServer(url, adminUser.token, membershipId, role);

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();

    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    testUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
    testUser2 = await loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password);

    testEventCategory = await readFirstEventCategory(url);
  });

  afterAll(async () => {
    if (server) {
      await stopIntegrationServer(server);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdEventIds.map((eventId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getDeleteEventByIdMutation(eventId))
          .catch(() => {}),
      ),
    );
    createdEventIds.length = 0;

    await Promise.all(
      createdMembershipIds.map((membershipId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteOrganizationMembershipMutation({ membershipId }))
          .catch(() => {}),
      ),
    );
    createdMembershipIds.length = 0;

    await Promise.all(
      createdOrgIds.map((orgId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteOrganizationByIdMutation(orgId))
          .catch(() => {}),
      ),
    );
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a new event with valid input', async () => {
      const createdEvent = await createEvent();
      expect(createdEvent).toHaveProperty('eventId');
      expect(createdEvent.title).toBe(testEventTitle);
    });

    it('reads the event by id and slug after creation', async () => {
      const createdEvent = await createEvent();

      const readById = await request(url).post('').send(getReadEventByIdQuery(createdEvent.eventId));
      expect(readById.status).toBe(200);
      expect(readById.body.data.readEventById.eventId).toBe(createdEvent.eventId);

      const readBySlug = await request(url).post('').send(getReadEventBySlugQuery(createdEvent.slug));
      expect(readBySlug.status).toBe(200);
      expect(readBySlug.body.data.readEventBySlug.slug).toBe(createdEvent.slug);
    });

    describe('updateEvent Mutation', () => {
      it('updates an event when valid input is provided', async () => {
        const createdEvent = await createEvent();
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
        const createdEvent = await createEvent();
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getDeleteEventBySlugMutation(testEventSlug));

        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventBySlug.slug).toBe(testEventSlug);
        untrackCreatedId(createdEventIds, createdEvent.eventId);
      });

      it('deletes an event by id', async () => {
        const createdEvent = await createEvent();
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + testUser.token)
          .send(getDeleteEventByIdMutation(createdEvent.eventId));

        expect(response.status).toBe(200);
        expect(response.body.data.deleteEventById.eventId).toBe(createdEvent.eventId);
        untrackCreatedId(createdEventIds, createdEvent.eventId);
      });
    });
  });

  describe('readEvents Query', () => {
    it('reads multiple events with no filters', async () => {
      const event1 = await createEvent();
      const input2 = buildEventInput();
      input2.title = `Test Event Two ${Date.now()}`;
      const event2 = await createEvent(input2);

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
    });

    it('reads events with pagination', async () => {
      await createEvent();
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
      await createEvent();
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
      expect(Array.isArray(events)).toBe(true);
    });

    it('reads events with sort order', async () => {
      await createEvent();
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
      const event = await createEvent();
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
      await createEvent();

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
      const createdEvent = await createEvent();
      const response = await request(url)
        .post('')
        .send(getUpdateEventMutation({ eventId: createdEvent.eventId, title: 'No Token' }));
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns unauthenticated when deleting without token', async () => {
      const createdEvent = await createEvent();
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
      const createdEvent = await createEvent();

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser2.token)
        .send(getUpdateEventMutation({ eventId: createdEvent.eventId, title: 'Unauthorized Update' }));

      expect(response.status).toBe(403);
    });

    it('prevents unauthorized user from deleting event', async () => {
      const createdEvent = await createEvent();

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser2.token)
        .send(getDeleteEventByIdMutation(createdEvent.eventId));

      expect(response.status).toBe(403);
    });
  });

  describe('organization authorization guards', () => {
    it('returns UNAUTHORIZED when user does not have the required org role and succeeds after upgrading the role', async () => {
      const organization = await createOrganization(`org-guard-${randomId()}`);

      const membership = await createMembership(organization.orgId, testUser.userId, OrganizationRole.Member);

      const input = buildEventInput();
      input.orgId = organization.orgId;

      const unauthorizedResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser.token)
        .send(getCreateEventMutation(input));
      expect(unauthorizedResponse.status).toBe(403);
      expect(unauthorizedResponse.body.errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');

      await updateMembershipRole(membership.membershipId, OrganizationRole.Host);

      const allowedEvent = await createEvent(input);
      expect(allowedEvent).toHaveProperty('eventId');
    });

    it('prevents users who lack membership in the current org from removing it from an event', async () => {
      const organization = await createOrganization(`org-guard-remove-${randomId()}`);

      await createMembership(organization.orgId, testUser.userId, OrganizationRole.Host);

      const createdEvent = await createEvent({ ...buildEventInput(), orgId: organization.orgId });

      const removeOrgResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + testUser2.token)
        .send(
          getUpdateEventMutation({
            eventId: createdEvent.eventId,
            orgId: null,
          }),
        );

      expect(removeOrgResponse.status).toBe(403);
      expect(removeOrgResponse.body.errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
    });
  });
});
