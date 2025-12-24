import {ActivityObjectType, ActivityVerb, ActivityVisibility} from '@ntlango/commons/types/activity';
import {FollowStatus, FollowTargetType} from '@ntlango/commons/types/follow';
import {IntentVisibility, IntentSource, IntentStatus} from '@ntlango/commons/types/intent';

export type FollowSeed = {
  followerIndex: number;
  targetType: FollowTargetType;
  targetUserIndex?: number;
  targetOrgIndex?: number;
  status?: FollowStatus;
};

export type IntentSeed = {
  userIndex: number;
  eventIndex: number;
  status?: IntentStatus;
  visibility?: IntentVisibility;
  source?: IntentSource;
  metadata?: Record<string, any>;
};

export type ActivitySeed = {
  actorIndex: number;
  verb: ActivityVerb;
  objectType: ActivityObjectType;
  objectRef: 'event' | 'user';
  objectIndex: number;
  targetType?: ActivityObjectType;
  targetRef?: 'event' | 'user';
  targetIndex?: number;
  visibility?: ActivityVisibility;
  eventAt?: string;
  metadata?: Record<string, any>;
};

export const followSeedData: FollowSeed[] = [
  {followerIndex: 0, targetType: FollowTargetType.User, targetUserIndex: 1},
  {followerIndex: 0, targetType: FollowTargetType.Organization, targetOrgIndex: 0},
  {followerIndex: 2, targetType: FollowTargetType.User, targetUserIndex: 0, status: FollowStatus.Muted},
];

export const intentSeedData: IntentSeed[] = [
  {userIndex: 0, eventIndex: 0, status: IntentStatus.Going, visibility: IntentVisibility.Public, source: IntentSource.Manual},
  {userIndex: 1, eventIndex: 1, status: IntentStatus.Interested, visibility: IntentVisibility.Followers, source: IntentSource.Invite},
];

export const activitySeedData: ActivitySeed[] = [
  {
    actorIndex: 0,
    verb: ActivityVerb.Followed,
    objectType: ActivityObjectType.User,
    objectRef: 'user',
    objectIndex: 1,
    visibility: ActivityVisibility.Public,
  },
  {
    actorIndex: 1,
    verb: ActivityVerb.RSVPd,
    objectType: ActivityObjectType.Event,
    objectRef: 'event',
    objectIndex: 0,
    visibility: ActivityVisibility.Public,
  },
];
