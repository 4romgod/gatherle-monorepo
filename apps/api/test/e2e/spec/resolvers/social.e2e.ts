import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/data/mock';
import { usersMockData } from '@/mongodb/data/mock';
import type { CreateEventInput, CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import {
  FollowTargetType,
  FollowPolicy,
  ActivityVerb,
  ActivityObjectType,
  ActivityVisibility,
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
  getUnfollowMutation,
  getUpdateUserMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import {
  assertNoCleanupFailures,
  cleanupTrackedEntities,
  createEventOnServer,
  createOrganizationOnServer,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

const getReadFollowRequestsQuery = (targetType: FollowTargetType) => ({
  query: `
    query GetFollowRequests($targetType: FollowTargetType!) {
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
  const url = process.env.GRAPHQL_URL!;
  const SOCIAL_HOOK_TIMEOUT_MS = 180_000;
  const SOCIAL_TEST_TIMEOUT_MS = 120_000;
  const SOCIAL_RESPONSE_TIMEOUT_MS = 25_000;
  const SOCIAL_DEADLINE_TIMEOUT_MS = 35_000;
  let adminUser: UserWithToken;
  let actorUser: UserWithToken;
  let targetUser: UserWithToken;
  let eventId = '';
  const createdEventIds: string[] = [];
  const createdOrgIds: string[] = [];
  const createdUserIds: string[] = [];
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const sendSocialGraphQlWithRetry = async (
    payload: object,
    token?: string,
    options: { maxAttempts?: number; retryOnNotFound?: boolean } = {},
  ) => {
    const { maxAttempts = 4, retryOnNotFound = false } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await request(url)
        .post('')
        .timeout({ response: SOCIAL_RESPONSE_TIMEOUT_MS, deadline: SOCIAL_DEADLINE_TIMEOUT_MS })
        .set(token ? { Authorization: `Bearer ${token}` } : {})
        .send(payload);

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status === 429 ||
          response.status >= 500 ||
          (retryOnNotFound && response.status === 404) ||
          /internal server error|timed out|timeout|temporarily unavailable|aborted|endpoint request timed out/i.test(
            failure,
          ));

      if (!shouldRetry) {
        return response;
      }

      await sleep(750 * attempt);
    }

    throw new Error('Failed to complete social GraphQL request after retrying transient errors.');
  };

  const followWithRetry = async (targetId: string) =>
    sendSocialGraphQlWithRetry(getFollowMutation({ targetType: FollowTargetType.User, targetId }), actorUser.token, {
      maxAttempts: 4,
    });

  const updateFollowPolicy = async (followPolicy: FollowPolicy) => {
    const response = await sendSocialGraphQlWithRetry(
      getUpdateUserMutation({
        userId: targetUser.userId,
        followPolicy,
      }),
      targetUser.token,
      { maxAttempts: 4 },
    );

    if (response.status !== 200 || response.body.errors) {
      throw new Error(`Failed to update follow policy: ${JSON.stringify(response.body.errors ?? response.body)}`);
    }

    return response;
  };

  const waitForFollowRequestApprovalStatus = async (followId: string, approvalStatus: string) => {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await sendSocialGraphQlWithRetry(
        getReadFollowRequestsQuery(FollowTargetType.User),
        targetUser.token,
        { maxAttempts: 1 },
      );

      if (response.status !== 200 || response.body.errors) {
        const failure = JSON.stringify(response.body.errors ?? response.body);
        const shouldRetry =
          attempt < maxAttempts &&
          /internal server error|timed out|timeout|temporarily unavailable|aborted|endpoint request timed out/i.test(
            failure,
          );

        if (!shouldRetry) {
          return response;
        }

        await sleep(750 * attempt);
        continue;
      }

      const matchingRequest = response.body.data.readFollowRequests.find((follow: any) => follow.followId === followId);
      if (matchingRequest?.approvalStatus === approvalStatus) {
        return response;
      }

      if (attempt === maxAttempts) {
        return response;
      }

      await sleep(750 * attempt);
    }

    throw new Error(`Follow request ${followId} did not reach approval status ${approvalStatus}.`);
  };

  const cleanupFollowState = async () => {
    const response = await sendSocialGraphQlWithRetry(
      getUnfollowMutation(FollowTargetType.User, targetUser.userId),
      actorUser.token,
      { maxAttempts: 2, retryOnNotFound: true },
    );

    const code = response.body.errors?.[0]?.extensions?.code;
    if ((response.status === 200 && !response.body.errors) || response.status === 404 || code === 'NOT_FOUND') {
      return;
    }

    throw new Error(`Failed to clean follow edge: ${JSON.stringify(response.body.errors ?? response.body)}`);
  };

  const resetFollowPolicy = async () => updateFollowPolicy(FollowPolicy.Public);

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const [seededAdmin, createdActor, createdTarget, category] = await Promise.all([
      loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password),
      createUserOnServer(
        url,
        buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, 'social-actor-password', uniqueSuffix()),
        createdUserIds,
      ),
      createUserOnServer(
        url,
        buildCreateUserInput(usersMockData.at(2)! as CreateUserInput, 'social-target-password', uniqueSuffix()),
        createdUserIds,
      ),
      readFirstEventCategory(url),
    ]);
    adminUser = seededAdmin;
    actorUser = createdActor;
    targetUser = createdTarget;

    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Social Feed EventSeries ${Date.now()}`,
      description: 'A gathering for social signals',
      eventCategories: [category.eventCategoryId],
      organizers: [{ user: actorUser.userId, role: 'Host' }],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: baseEventData.location,
    };

    const createdEvent = await createEventOnServer(url, actorUser.token, eventInput, createdEventIds);
    eventId = createdEvent.eventId;
  }, SOCIAL_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await cleanupFollowState();
    await resetFollowPolicy();

    await cleanupTrackedEntities({
      url,
      ids: createdOrgIds,
      deleteRequest: getDeleteOrganizationByIdMutation,
      token: () => actorUser.token,
      label: 'organization',
    });
  });

  afterAll(async () => {
    await cleanupFollowState();
    await resetFollowPolicy();

    const failures = [
      ...(await cleanupTrackedEntities({
        url,
        ids: createdOrgIds,
        deleteRequest: getDeleteOrganizationByIdMutation,
        token: () => actorUser.token,
        label: 'organization',
        phase: 'afterAll',
      })),
      ...(await cleanupTrackedEntities({
        url,
        ids: createdEventIds,
        deleteRequest: getDeleteEventByIdMutation,
        token: () => actorUser.token,
        label: 'event',
        phase: 'afterAll',
      })),
      ...(adminUser?.token && createdUserIds.length > 0
        ? await cleanupUsersById(url, adminUser.token, createdUserIds, 'afterAll')
        : []),
    ];
    assertNoCleanupFailures(failures);
  }, SOCIAL_HOOK_TIMEOUT_MS);

  it('creates and cleans up follows', async () => {
    const followResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getFollowMutation({ targetType: FollowTargetType.User, targetId: targetUser.userId }));

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.data.follow.targetId).toBe(targetUser.userId);
    expect(followResponse.body.data.follow.approvalStatus).toBe('Accepted');

    const followingResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadFollowingQuery());

    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body.data.readFollowing.length).toBeGreaterThan(0);

    const followerResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + targetUser.token)
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

  it('logs activities and serves feed items', async () => {
    const logResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.RSVPd,
          objectType: ActivityObjectType.EventSeries,
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
    const firstFollow = await followWithRetry(targetUser.userId);

    expect(firstFollow.status).toBe(200);

    const duplicateFollow = await followWithRetry(targetUser.userId);

    expect([200, 409]).toContain(duplicateFollow.status);
  });

  it(
    'supports follow request accept lifecycle when follow approval is required',
    async () => {
      const policyUpdate = await updateFollowPolicy(FollowPolicy.RequireApproval);
      expect(policyUpdate.status).toBe(200);

      const followResponse = await followWithRetry(targetUser.userId);

      expect(followResponse.status).toBe(200);
      expect(followResponse.body.data.follow.approvalStatus).toBe('Pending');

      const followId = followResponse.body.data.follow.followId;

      const followRequestsResponse = await waitForFollowRequestApprovalStatus(followId, 'Pending');

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

      const acceptResponse = await sendSocialGraphQlWithRetry(
        getAcceptFollowRequestMutation(followId),
        targetUser.token,
        {
          maxAttempts: 4,
        },
      );

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.data.acceptFollowRequest.approvalStatus).toBe('Accepted');

      const followingResponse = await sendSocialGraphQlWithRetry(getReadFollowingQuery(), actorUser.token, {
        maxAttempts: 4,
      });

      expect(followingResponse.status).toBe(200);
      expect(followingResponse.body.data.readFollowing).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            followId,
            approvalStatus: 'Accepted',
          }),
        ]),
      );
    },
    SOCIAL_TEST_TIMEOUT_MS,
  );

  it(
    'supports follow request reject lifecycle when follow approval is required',
    async () => {
      const policyUpdate = await updateFollowPolicy(FollowPolicy.RequireApproval);
      expect(policyUpdate.status).toBe(200);

      const followResponse = await followWithRetry(targetUser.userId);

      expect(followResponse.status).toBe(200);
      expect(followResponse.body.data.follow.approvalStatus).toBe('Pending');

      const followId = followResponse.body.data.follow.followId;

      const rejectResponse = await sendSocialGraphQlWithRetry(
        getRejectFollowRequestMutation(followId),
        targetUser.token,
        {
          maxAttempts: 4,
        },
      );

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.rejectFollowRequest).toBe(true);

      const followRequestsResponse = await waitForFollowRequestApprovalStatus(followId, 'Rejected');

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
    },
    SOCIAL_TEST_TIMEOUT_MS,
  );

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

  it('requires authentication for activity logging', async () => {
    const response = await request(url)
      .post('')
      .send(
        getLogActivityMutation({
          verb: ActivityVerb.RSVPd,
          objectType: ActivityObjectType.EventSeries,
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
          objectType: ActivityObjectType.EventSeries,
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
          objectType: ActivityObjectType.EventSeries,
          objectId: eventId,
          visibility: ActivityVisibility.Followers,
        }),
      );

    expect(followersActivity.status).toBe(200);
    expect(followersActivity.body.data.logActivity.visibility).toBe(ActivityVisibility.Followers);
  });
});
