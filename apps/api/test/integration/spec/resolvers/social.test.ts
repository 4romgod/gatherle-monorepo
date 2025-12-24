import request from 'supertest';
import type {IntegrationServer} from '@/test/integration/utils/server';
import {startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {EventCategoryDAO, EventDAO, UserDAO} from '@/mongodb/dao';
import {Activity, Follow, Intent} from '@/mongodb/models';
import {usersMockData, eventsMockData} from '@/mongodb/mockData';
import {EventCategory, User, UserWithToken, CreateEventInput} from '@ntlango/commons/types';
import {EventStatus, EventVisibility, EventLifecycleStatus} from '@ntlango/commons/types/event';
import {FollowTargetType} from '@ntlango/commons/types/follow';
import {IntentStatus, IntentVisibility, IntentSource} from '@ntlango/commons/types/intent';
import {ActivityVerb, ActivityObjectType, ActivityVisibility} from '@ntlango/commons/types/activity';
import {SocialVisibility, CreateUserInput} from '@ntlango/commons/types/user';
import {getFollowMutation, getReadFollowersQuery, getReadFollowingQuery, getReadFeedQuery, getLogActivityMutation, getReadActivitiesByActorQuery, getUpsertIntentMutation, getReadIntentsByEventQuery, getReadIntentsByUserQuery, getUnfollowMutation} from '@/test/utils';

const TEST_PORT = 5010;

describe('Social resolver integration', () => {
  let server: IntegrationServer;
  let url = '';
  let actorUser: UserWithToken;
  let targetUser: User;
  let category: EventCategory;
  let eventId = '';

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;

    const baseActorUser: CreateUserInput = {
      ...usersMockData[0],
      email: 'social-actor@example.com',
      username: 'socialActor',
      socialVisibility: SocialVisibility.Public,
      shareRSVPByDefault: true,
    };
    actorUser = await UserDAO.create(baseActorUser);

    targetUser = await UserDAO.create({
      ...usersMockData[1],
      email: 'social-target@example.com',
      username: 'socialTarget',
    });

    category = await EventCategoryDAO.create({
      name: 'Social Feed Category',
      iconName: 'share',
      description: 'Category for social feed testing',
    });

    const eventInput: CreateEventInput = {
      ...eventsMockData[0],
      title: 'Social Feed Event',
      description: 'A gathering for social signals',
      eventCategoryList: [category.eventCategoryId],
      organizerList: [actorUser.userId],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: eventsMockData[0].location,
      recurrenceRule: eventsMockData[0].recurrenceRule,
    };

    const event = await EventDAO.create(eventInput);
    eventId = event.eventId;
  });

  afterAll(async () => {
    await Follow.deleteMany({followerUserId: actorUser.userId}).catch(() => {});
    await Intent.deleteMany({userId: actorUser.userId}).catch(() => {});
    await Activity.deleteMany({actorId: actorUser.userId}).catch(() => {});
    await EventDAO.deleteEventById(eventId).catch(() => {});
    await EventCategoryDAO.deleteEventCategoryBySlug(category.slug).catch(() => {});
    await UserDAO.deleteUserById(actorUser.userId).catch(() => {});
    await UserDAO.deleteUserById(targetUser.userId).catch(() => {});
    await stopIntegrationServer(server);
  });

  it('creates and cleans up follows', async () => {
    const followResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getFollowMutation({targetType: FollowTargetType.User, targetId: targetUser.userId}));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.targetId).toBe(targetUser.userId);

    const followingResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadFollowingQuery());

    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body.data.readFollowing.length).toBeGreaterThan(0);

    const followerResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadFollowersQuery(FollowTargetType.User, targetUser.userId));

    expect(followerResponse.status).toBe(200);
    expect(followerResponse.body.data.readFollowers.length).toBeGreaterThan(0);

    const unfollowResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getUnfollowMutation(FollowTargetType.User, targetUser.userId));

    if (unfollowResponse.status !== 200) {
      console.error('UNFOLLOW RESPONSE ERROR', unfollowResponse.body);
    }
    expect(unfollowResponse.status).toBe(200);
    expect(unfollowResponse.body.data.unfollow).toBe(true);
  });

  it('records intents and surfaces them by user/event', async () => {
    const intentResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(
        getUpsertIntentMutation({
          eventId,
          status: IntentStatus.Going,
          visibility: IntentVisibility.Public,
          source: IntentSource.Manual,
        }),
      );

    expect(intentResponse.status).toBe(200);
    expect(intentResponse.body.data.upsertIntent.eventId).toBe(eventId);

    const userIntentsResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadIntentsByUserQuery());

    expect(userIntentsResponse.status).toBe(200);
    expect(userIntentsResponse.body.data.readIntentsByUser.length).toBeGreaterThan(0);

    const eventIntentsResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadIntentsByEventQuery(eventId));

    expect(eventIntentsResponse.status).toBe(200);
    expect(eventIntentsResponse.body.data.readIntentsByEvent.length).toBeGreaterThan(0);
  });

  it('logs activities and serves feed items', async () => {
    const logResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.RSVPd,
          objectType: ActivityObjectType.Event,
          objectId: eventId,
          visibility: ActivityVisibility.Public,
        }),
      );

    expect(logResponse.status).toBe(200);
    expect(logResponse.body.data.logActivity.actorId).toBe(actorUser.userId);

    const actorFeedResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadActivitiesByActorQuery(actorUser.userId));

    expect(actorFeedResponse.status).toBe(200);
    expect(actorFeedResponse.body.data.readActivitiesByActor.length).toBeGreaterThan(0);

    const feedResponse = await request(url)
      .post('')
      .set('token', actorUser.token)
      .send(getReadFeedQuery(5));

    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.data.readFeed.length).toBeGreaterThan(0);
  });
});
