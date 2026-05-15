import type { GetFollowersQuery, GetFollowingQuery, GetPendingFollowRequestsQuery } from '../../types/graphql';

export type MobileFollowRequest = GetPendingFollowRequestsQuery['readPendingFollowRequests'][number];
export type MobileFollowing = GetFollowingQuery['readFollowing'][number];
export type MobileFollower = GetFollowersQuery['readFollowers'][number];
