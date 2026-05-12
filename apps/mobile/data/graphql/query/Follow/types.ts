import type { GetPendingFollowRequestsQuery } from '../../types/graphql';

export type MobileFollowRequest = GetPendingFollowRequestsQuery['readPendingFollowRequests'][number];
