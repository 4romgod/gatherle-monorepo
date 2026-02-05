import { ActivityObjectType, ActivityVerb, ActivityVisibility } from '@ntlango/commons/types/activity';
import type { FollowApprovalStatus } from '@ntlango/commons/types/follow';
import { FollowTargetType } from '@ntlango/commons/types/follow';
import { IntentVisibility, IntentSource, IntentStatus } from '@ntlango/commons/types/intent';

export type FollowSeed = {
  followerEmail: string;
  targetType: FollowTargetType;
  targetUserEmail?: string;
  targetOrgSlug?: string;
  approvalStatus?: FollowApprovalStatus;
};

export type IntentSeed = {
  userEmail: string;
  eventTitle: string;
  status?: IntentStatus;
  visibility?: IntentVisibility;
  source?: IntentSource;
  metadata?: Record<string, any>;
};

export type ActivitySeed = {
  actorEmail: string;
  verb: ActivityVerb;
  objectType: ActivityObjectType;
  objectRef: 'event' | 'user';
  objectIdentifier: string;
  targetType?: ActivityObjectType;
  targetRef?: 'event' | 'user';
  targetIdentifier?: string;
  visibility?: ActivityVisibility;
  eventAt?: string;
  metadata?: Record<string, any>;
};

export const followSeedData: FollowSeed[] = [
  {
    followerEmail: 'user001@gmail.com',
    targetType: FollowTargetType.User,
    targetUserEmail: 'jay@rocknation.com',
  },
  {
    followerEmail: 'user001@gmail.com',
    targetType: FollowTargetType.Organization,
    targetOrgSlug: 'signal-studios',
  },
  {
    followerEmail: 'celin@yahoo.com',
    targetType: FollowTargetType.User,
    targetUserEmail: 'user001@gmail.com',
  },
  {
    followerEmail: 'jay@rocknation.com',
    targetType: FollowTargetType.User,
    targetUserEmail: 'celin@yahoo.com',
  },
];

export const intentSeedData: IntentSeed[] = [
  {
    userEmail: 'user001@gmail.com',
    eventTitle: 'Signal Studios Urban Maker Fair',
    status: IntentStatus.Going,
    visibility: IntentVisibility.Public,
    source: IntentSource.Manual,
  },
  {
    userEmail: 'jay@rocknation.com',
    eventTitle: 'Harbour Collective: Salt City Night Market',
    status: IntentStatus.Interested,
    visibility: IntentVisibility.Followers,
    source: IntentSource.Invite,
  },
];

export const activitySeedData: ActivitySeed[] = [
  {
    actorEmail: 'user001@gmail.com',
    verb: ActivityVerb.Followed,
    objectType: ActivityObjectType.User,
    objectRef: 'user',
    objectIdentifier: 'jay@rocknation.com',
    visibility: ActivityVisibility.Public,
  },
  {
    actorEmail: 'jay@rocknation.com',
    verb: ActivityVerb.RSVPd,
    objectType: ActivityObjectType.Event,
    objectRef: 'event',
    objectIdentifier: 'Signal Studios Urban Maker Fair',
    visibility: ActivityVisibility.Public,
  },
];
