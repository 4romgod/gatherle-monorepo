import type {
  GetEventMomentsQuery,
  GetMomentsFeedQuery,
  GetFollowedMomentsQuery,
  GetUserEventMomentsQuery,
  GetUserMomentsQuery,
} from '../../types/graphql';

export type MobileMomentsFeedMoment = GetMomentsFeedQuery['readMomentsFeed']['items'][number];
export type MobileFollowedMoment = GetFollowedMomentsQuery['readFollowedMoments']['items'][number];
export type MobileEventMoment = GetEventMomentsQuery['readEventMoments']['items'][number];
export type MobileUserEventMoment = GetUserEventMomentsQuery['readUserEventMoments'][number];
export type MobileUserMoment = GetUserMomentsQuery['readUserMoments']['items'][number];
