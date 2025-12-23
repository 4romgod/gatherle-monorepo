import request from 'supertest';
import {Types} from 'mongoose';
import type {IntegrationServer} from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {EventDAO, EventCategoryDAO, UserDAO} from '@/mongodb/dao';
import {EventParticipant} from '@/mongodb/models';
import {usersMockData, eventsMockData} from '@/mongodb/mockData';
import {generateToken} from '@/utils/auth';
import type { User, UserWithToken, CreateEventInput, EventCategory} from '@ntlango/commons/types';
import {ParticipantStatus, UserRole} from '@ntlango/commons/types';
import {getCancelEventParticipantMutation, getReadEventParticipantsQuery, getUpsertEventParticipantMutation} from '@/test/utils';

const TEST_PORT = 5005;

describe('EventParticipant Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  let participantUser: UserWithToken;
  let eventId = '';
  let category: EventCategory;

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    const user = {
      ...usersMockData[1],
      userId: new Types.ObjectId().toString(),
      userRole: UserRole.User,
      email: 'participant@example.com',
      username: 'participantUser',
      interests: undefined,
    } as User;
    participantUser = {
      ...user,
      token: await generateToken(user),
    };
    category = await EventCategoryDAO.create({
      name: 'Participant Category',
      iconName: 'icon',
      description: 'For participants',
    });
    const eventInput: CreateEventInput = {
      ...eventsMockData[0],
      title: 'Participant Event',
      description: 'Testing participants',
      eventCategoryList: [category.eventCategoryId],
      organizerList: [participantUser.userId],
    };
    const event = await EventDAO.create(eventInput);
    eventId = event.eventId;
  });

  afterAll(async () => {
    await EventParticipant.deleteMany({eventId}).catch(() => {});
    await EventDAO.deleteEventById(eventId).catch(() => {});
    await EventCategoryDAO.deleteEventCategoryBySlug(category.slug).catch(() => {});
    await UserDAO.deleteUserByEmail(participantUser.email).catch(() => {});
    await stopIntegrationServer(server);
  });

  it('upserts a participant', async () => {
    const response = await request(url)
      .post('')
      .set('token', participantUser.token)
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
      .set('token', participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );
    const response = await request(url).post('').set('token', participantUser.token).send(getReadEventParticipantsQuery(eventId));
    expect(response.status).toBe(200);
    expect(response.body.data.readEventParticipants.length).toBeGreaterThan(0);
  });

  it('cancels a participant', async () => {
    await request(url)
      .post('')
      .set('token', participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId,
          userId: participantUser.userId,
        }),
      );
    const response = await request(url)
      .post('')
      .set('token', participantUser.token)
      .send(getCancelEventParticipantMutation({eventId, userId: participantUser.userId}));
    expect(response.status).toBe(200);
    expect(response.body.data.cancelEventParticipant.status).toBe(ParticipantStatus.Cancelled);
  });
});
