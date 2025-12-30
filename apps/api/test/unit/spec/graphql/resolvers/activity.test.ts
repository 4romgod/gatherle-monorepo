import 'reflect-metadata';
import {ActivityResolver} from '@/graphql/resolvers/activity';
import {ActivityDAO, FollowDAO} from '@/mongodb/dao';
import type {Activity, CreateActivityInput, User} from '@ntlango/commons/types';
import {ActivityObjectType, ActivityVerb, ActivityVisibility, FollowTargetType, UserRole} from '@ntlango/commons/types';
import {Types} from 'mongoose';
import {requireAuthenticatedUser} from '@/utils';

jest.mock('@/mongodb/dao', () => ({
  ActivityDAO: {
    create: jest.fn(),
    readByActor: jest.fn(),
    readByActorIds: jest.fn(),
  },
  FollowDAO: {
    readFollowingForUser: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

describe('ActivityResolver', () => {
  let resolver: ActivityResolver;
  const mockUser: User = {
    userId: 'user-1',
    email: 'friend@example.com',
    username: 'friend',
    birthdate: '1990-01-01',
    given_name: 'Friend',
    family_name: 'Friendson',
    password: 'secret',
    userRole: UserRole.User,
  };

  beforeEach(() => {
    resolver = new ActivityResolver();
    jest.clearAllMocks();
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  it('logs an activity', async () => {
    const activityInput: CreateActivityInput = {
      verb: ActivityVerb.RSVPd,
      objectType: ActivityObjectType.Event,
      objectId: new Types.ObjectId().toString(),
      visibility: ActivityVisibility.Public,
    };
    const mockActivity: Activity = {
      activityId: 'activity-1',
      actorId: mockUser.userId,
      verb: ActivityVerb.RSVPd,
      objectType: ActivityObjectType.Event,
      objectId: 'event-1',
      visibility: ActivityVisibility.Public,
      createdAt: new Date(),
    };

    (ActivityDAO.create as jest.Mock).mockResolvedValue(mockActivity);

    const result = await resolver.logActivity(activityInput, {} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(ActivityDAO.create).toHaveBeenCalledWith({...activityInput, actorId: mockUser.userId});
    expect(result).toEqual(mockActivity);
  });

  it('reads activities for an actor', async () => {
    const activities: Activity[] = [];
    (ActivityDAO.readByActor as jest.Mock).mockResolvedValue(activities);
    (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);

    const result = await resolver.readActivitiesByActor('actor-1', {} as never, 5);

    expect(ActivityDAO.readByActor).toHaveBeenCalledWith('actor-1', 5);
    expect(result).toStrictEqual(activities);
  });

  it('reads feed including follow relationships', async () => {
    const follows = [
      {targetType: FollowTargetType.User, targetId: 'friend-1'},
      {targetType: FollowTargetType.Organization, targetId: 'org-1'},
    ];
    const feed: Activity[] = [];
    (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue(follows);
    (ActivityDAO.readByActorIds as jest.Mock).mockResolvedValue(feed);

    const result = await resolver.readFeed({} as never, 10);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(FollowDAO.readFollowingForUser).toHaveBeenCalledWith(mockUser.userId);
    expect(ActivityDAO.readByActorIds).toHaveBeenCalledWith(['friend-1', mockUser.userId], 10);
    expect(result).toBe(feed);
  });
});
