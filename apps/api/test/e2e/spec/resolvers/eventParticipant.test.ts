import request from 'supertest';
import type { E2EServer } from '@/test/e2e/utils/server';
import { startE2EServer, stopE2EServer } from '@/test/e2e/utils/server';
import { eventsMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import {
  getCancelEventParticipantMutation,
  getDeleteEventByIdMutation,
  getReadEventParticipantsQuery,
  getUpsertEventParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import { createEventOnServer } from '@/test/e2e/utils/eventResolverHelpers';

const TEST_PORT = 5005;

describe('EventParticipant Resolver', () => {
  let server: E2EServer;
  let url = '';
  let participantUser: UserWithToken;
  let participantUser2: UserWithToken;
  let eventId = '';
  let eventCreatorToken = '';
  let eventCategoryId = '';
  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventsMockData[0];
    return rest;
  })();

  const buildEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: `Participant Event ${Date.now()}`,
    description: 'Testing participants',
    eventCategories: [eventCategoryId],
    organizers: [{ user: participantUser.userId, role: 'Host' }],
  });

  beforeAll(async () => {
    server = await startE2EServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    participantUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
    participantUser2 = await loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password);

    const category = await readFirstEventCategory(url);
    eventCategoryId = category.eventCategoryId;
    eventCreatorToken = participantUser.token;
  });

  beforeEach(async () => {
    const created = await createEventOnServer(url, participantUser.token, buildEventInput(), []);
    eventId = created.eventId;
  });

  afterEach(async () => {
    if (eventId) {
      await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + eventCreatorToken)
        .send(getDeleteEventByIdMutation(eventId))
        .catch(() => {});
    }
    eventId = '';
  });

  afterAll(async () => {
    if (server) {
      await stopE2EServer(server);
    }
  });

  it('upserts a participant', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );
    expect(response.status).toBe(200);
    expect(response.body.data.upsertEventParticipant.eventId).toBe(eventId);
  });

  it('reads participants for an event', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(getReadEventParticipantsQuery(eventId));
    expect(response.status).toBe(200);
    expect(response.body.data.readEventParticipants.length).toBeGreaterThan(0);
  });

  it('cancels a participant', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
        }),
      );
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(getCancelEventParticipantMutation({ eventId, userId: participantUser.userId }));
    expect(response.status).toBe(200);
    expect(response.body.data.cancelEventParticipant.status).toBe(ParticipantStatus.Cancelled);
  });

  it('updates participant status from Going to Interested', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    const updateResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Interested,
        }),
      );

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.upsertEventParticipant.status).toBe(ParticipantStatus.Interested);
  });

  it('handles multiple participants for same event', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser2.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser2.userId,
          status: ParticipantStatus.Going,
        }),
      );

    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(getReadEventParticipantsQuery(eventId));

    expect(response.status).toBe(200);
    expect(response.body.data.readEventParticipants.length).toBeGreaterThanOrEqual(2);
  });

  it('returns error when event ID is invalid', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId: 'invalid-id',
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    expect([400, 404]).toContain(response.status);
  });

  it('returns error when cancelling non-existent participant', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getCancelEventParticipantMutation({
          eventId,
          userId: participantUser2.userId,
        }),
      );

    expect([403, 404]).toContain(response.status);
  });

  it('requires authentication for upserting participant', async () => {
    const response = await request(url)
      .post('')
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    expect(response.status).toBe(401);
  });

  it('requires authentication for cancelling participant', async () => {
    const response = await request(url)
      .post('')
      .send(
        getCancelEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
        }),
      );

    expect(response.status).toBe(401);
  });
});
