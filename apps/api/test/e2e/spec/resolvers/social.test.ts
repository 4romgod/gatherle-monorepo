import request from 'supertest';
import type { E2EServer } from '@/test/e2e/utils/server';
import { startE2EServer, stopE2EServer } from '@/test/e2e/utils/server';
import { eventsMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import {
  FollowTargetType,
  FollowPolicy,
  ActivityVerb,
  ActivityObjectType,
  ActivityVisibility,
  IntentStatus,
  IntentVisibility,
  IntentSource,
  EventStatus,
  EventVisibility,
  EventLifecycleStatus,
} from '@gatherle/commons/types';
import {
  getDeleteEventByIdMutation,
  getDeleteOrganizationByIdMutation,
  getFollowMutation,
  getReadFollowersQuery,
  getReadFollowingQuery,
  getReadFeedQuery,
  getLogActivityMutation,
  getReadActivitiesByActorQuery,
  getUpsertIntentMutation,
  getReadIntentsByEventQuery,
  getReadIntentsByUserQuery,
  getUnfollowMutation,
  getUpdateUserMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import { createEventOnServer, createOrganizationOnServer } from '@/test/e2e/utils/eventResolverHelpers';

const TEST_PORT = 5010;

const getReadFollowRequestsQuery = (targetType: FollowTargetType) => ({
  query: `
    query ReadFollowRequests($targetType: FollowTargetType!) {
      readFollowRequests(targetType: $targetType) {
        followId
        followerUserId
        targetType
        targetId
        approvalStatus
      }
    }
  `,
  variables: {
    targetType,
  },
});

const getAcceptFollowRequestMutation = (followId: string) => ({
  query: `
    mutation AcceptFollowRequest($followId: ID!) {
      acceptFollowRequest(followId: $followId) {
        followId
        followerUserId
        targetId
        approvalStatus
      }
    }
  `,
  variables: {
    followId,
  },
});

const getRejectFollowRequestMutation = (followId: string) => ({
  query: `
    mutation RejectFollowRequest($followId: ID!) {
      rejectFollowRequest(followId: $followId)
    }
  `,
  variables: {
    followId,
  },
});

describe('Social resolver e2e', () => {
  let server: E2EServer;
  let url = '';
  let actorUser: UserWithToken;
  let targetUser: UserWithToken;
  let eventId = '';
  const createdEventIds: string[] = [];
  const createdOrgIds: string[] = [];
  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventsMockData[0];
    return rest;
  })();

  beforeAll(async () => {
    server = await startE2EServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    actorUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
    targetUser = await loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password);

    const category = await readFirstEventCategory(url);

    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Social Feed Event ${Date.now()}`,
      description: 'A gathering for social signals',
      eventCategories: [category.eventCategoryId],
      organizers: [{ user: actorUser.userId, role: 'Host' }],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: baseEventData.location,
      recurrenceRule: baseEventData.recurrenceRule,
    };

    const createdEvent = await createEventOnServer(url, actorUser.token, eventInput, createdEventIds);
    eventId = createdEvent.eventId;
  });

  afterEach(async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getUnfollowMutation(FollowTargetType.User, targetUser.userId))
      .catch(() => {});

    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(
        getUpdateUserMutation({
          userId: targetUser.userId,
          followPolicy: FollowPolicy.Public,
        }),
      )
      .catch(() => {});
  });

  afterAll(async () => {
    await Promise.all(
      createdOrgIds.map((orgId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + actorUser.token)
          .send(getDeleteOrganizationByIdMutation(orgId))
          .catch(() => {}),
      ),
    );

    await Promise.all(
      createdEventIds.map((id) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + actorUser.token)
          .send(getDeleteEventByIdMutation(id))
          .catch(() => {}),
      ),
    );

    if (server) {
      await stopE2EServer(server);
    }
  });

  it('creates and cleans up follows', async () => {
    const followResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.targetId).toBe(targetUser.userId);

    const followingResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadFollowingQuery());

    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body.data.readFollowing.length).toBeGreaterThan(0);

    const followerResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadFollowersQuery(FollowTargetType.User, targetUser.userId));

    expect(followerResponse.status).toBe(200);
    expect(followerResponse.body.data.readFollowers.length).toBeGreaterThan(0);

    const unfollowResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getUnfollowMutation(FollowTargetType.User, targetUser.userId));

    expect(unfollowResponse.status).toBe(200);
    expect(unfollowResponse.body.data.unfollow).toBe(true);
  });

  it('records intents and surfaces them by user/event', async () => {
    const intentResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
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
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadIntentsByUserQuery());

    expect(userIntentsResponse.status).toBe(200);
    expect(userIntentsResponse.body.data.readIntentsByUser.length).toBeGreaterThan(0);

    const eventIntentsResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadIntentsByEventQuery(eventId));

    expect(eventIntentsResponse.status).toBe(200);
    expect(eventIntentsResponse.body.data.readIntentsByEvent.length).toBeGreaterThan(0);
  });

  it('logs activities and serves feed items', async () => {
    const logResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
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
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadActivitiesByActorQuery(actorUser.userId));

    expect(actorFeedResponse.status).toBe(200);
    expect(actorFeedResponse.body.data.readActivitiesByActor.length).toBeGreaterThan(0);

    const feedResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadFeedQuery(5));

    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.data.readFeed.length).toBeGreaterThan(0);
  });

  it('handles duplicate follows gracefully', async () => {
    const firstFollow = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(firstFollow.status).toBe(200);

    const duplicateFollow = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect([200, 409]).toContain(duplicateFollow.status);
  });

  it('supports follow request accept lifecycle when follow approval is required', async () => {
    const policyUpdate = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(
        getUpdateUserMutation({
          userId: targetUser.userId,
          followPolicy: FollowPolicy.RequireApproval,
        }),
      );
    expect(policyUpdate.status).toBe(200);

    const followResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.approvalStatus).toBe('Pending');

    const followId = followResponse.body.data.follow.followId;

    const followRequestsResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(getReadFollowRequestsQuery(FollowTargetType.User));

    expect(followRequestsResponse.status).toBe(200);
    expect(followRequestsResponse.body.data.readFollowRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          followId,
          approvalStatus: 'Pending',
          followerUserId: actorUser.userId,
        }),
      ]),
    );

    const acceptResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(getAcceptFollowRequestMutation(followId));

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.data.acceptFollowRequest.approvalStatus).toBe('Accepted');

    const followingResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadFollowingQuery());

    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body.data.readFollowing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          followId,
          approvalStatus: 'Accepted',
        }),
      ]),
    );
  });

  it('supports follow request reject lifecycle when follow approval is required', async () => {
    const policyUpdate = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(
        getUpdateUserMutation({
          userId: targetUser.userId,
          followPolicy: FollowPolicy.RequireApproval,
        }),
      );
    expect(policyUpdate.status).toBe(200);

    const followResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.approvalStatus).toBe('Pending');

    const followId = followResponse.body.data.follow.followId;

    const rejectResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(getRejectFollowRequestMutation(followId));

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.data.rejectFollowRequest).toBe(true);

    const followRequestsResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
      .send(getReadFollowRequestsQuery(FollowTargetType.User));

    expect(followRequestsResponse.status).toBe(200);
    expect(followRequestsResponse.body.data.readFollowRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          followId,
          approvalStatus: 'Rejected',
          followerUserId: actorUser.userId,
        }),
      ]),
    );
  });

  it('handles intent status updates', async () => {
    const initialIntent = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(
        getUpsertIntentMutation({
          eventId,
          status: IntentStatus.Interested,
          visibility: IntentVisibility.Public,
          source: IntentSource.Manual,
        }),
      );

    expect(initialIntent.status).toBe(200);
    expect(initialIntent.body.data.upsertIntent.status).toBe(IntentStatus.Interested);

    const updatedIntent = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(
        getUpsertIntentMutation({
          eventId,
          status: IntentStatus.Going,
          visibility: IntentVisibility.Public,
          source: IntentSource.Manual,
        }),
      );

    expect(updatedIntent.status).toBe(200);
    expect(updatedIntent.body.data.upsertIntent.status).toBe(IntentStatus.Going);
  });

  it('requires authentication for follow mutation', async () => {
    const response = await request(url)
      .post('')
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(response.status).toBe(401);
  });

  it('requires authentication for unfollow mutation', async () => {
    const response = await request(url).post('').send(getUnfollowMutation(FollowTargetType.User, targetUser.userId));

    expect(response.status).toBe(401);
  });

  it('requires authentication for intent mutations', async () => {
    const response = await request(url)
      .post('')
      .send(
        getUpsertIntentMutation({
          eventId,
          status: IntentStatus.Going,
          visibility: IntentVisibility.Public,
          source: IntentSource.Manual,
        }),
      );

    expect(response.status).toBe(401);
  });

  it('requires authentication for activity logging', async () => {
    const response = await request(url)
      .post('')
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.RSVPd,
          objectType: ActivityObjectType.Event,
          objectId: eventId,
          visibility: ActivityVisibility.Public,
        }),
      );

    expect(response.status).toBe(401);
  });

  it('returns validation error for invalid follow target type', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: 'InvalidType', targetId: targetUser.userId }));

    expect(response.status).toBe(400);
  });

  it('allows following an organization', async () => {
    const org = await createOrganizationOnServer(
      url,
      actorUser.token,
      actorUser.userId,
      `Follow Org ${Date.now()}`,
      createdOrgIds,
    );

    const followResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.Organization, targetId: org.orgId }));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.targetType).toBe(FollowTargetType.Organization);
    expect(followResponse.body.data.follow.targetId).toBe(org.orgId);

    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getUnfollowMutation(FollowTargetType.Organization, org.orgId));
  });

  it('records activities with different visibility levels', async () => {
    const privateActivity = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.Commented,
          objectType: ActivityObjectType.Event,
          objectId: eventId,
          visibility: ActivityVisibility.Private,
        }),
      );

    expect(privateActivity.status).toBe(200);
    expect(privateActivity.body.data.logActivity.visibility).toBe(ActivityVisibility.Private);

    const followersActivity = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.CheckedIn,
          objectType: ActivityObjectType.Event,
          objectId: eventId,
          visibility: ActivityVisibility.Followers,
        }),
      );

    expect(followersActivity.status).toBe(200);
    expect(followersActivity.body.data.logActivity.visibility).toBe(ActivityVisibility.Followers);
  });
});
