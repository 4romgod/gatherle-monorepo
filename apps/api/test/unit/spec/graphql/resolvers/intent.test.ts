import 'reflect-metadata';
import { IntentResolver } from '@/graphql/resolvers/intent';
import { IntentDAO } from '@/mongodb/dao';
import { Intent, IntentStatus, IntentVisibility, IntentSource, UpsertIntentInput, User, UserRole } from '@ntlango/commons/types';
import { Types } from 'mongoose';
import { requireAuthenticatedUser } from '@/graphql/resolvers/utils/requireAuthenticatedUser';

jest.mock('@/mongodb/dao', () => ({
  IntentDAO: {
    upsert: jest.fn(),
    readByUser: jest.fn(),
    readByEvent: jest.fn(),
  },
}));

jest.mock('@/graphql/resolvers/utils/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

describe('IntentResolver', () => {
  let resolver: IntentResolver;
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
  const mockEventId = new Types.ObjectId().toString();

  beforeEach(() => {
    resolver = new IntentResolver();
    jest.clearAllMocks();
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  it('upserts intent', async () => {
    const mockInput: UpsertIntentInput = {
      eventId: mockEventId,
      status: IntentStatus.Going,
      visibility: IntentVisibility.Public,
      source: IntentSource.Manual,
    };
    const mockIntent: Intent = {
      intentId: 'intent-1',
      userId: mockUser.userId,
      eventId: mockInput.eventId,
      status: IntentStatus.Going,
      visibility: IntentVisibility.Public,
      source: IntentSource.Manual,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (IntentDAO.upsert as jest.Mock).mockResolvedValue(mockIntent);

    const result = await resolver.upsertIntent(mockInput, {} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(IntentDAO.upsert).toHaveBeenCalledWith({...mockInput, userId: mockUser.userId});
    expect(result).toEqual(mockIntent);
  });

  it('reads user intents', async () => {
    const intents: Intent[] = [];
    (IntentDAO.readByUser as jest.Mock).mockResolvedValue(intents);

    const result = await resolver.readIntentsByUser({} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(IntentDAO.readByUser).toHaveBeenCalledWith(mockUser.userId);
    expect(result).toBe(intents);
  });

  it('reads event intents', async () => {
    const intents: Intent[] = [];
    (IntentDAO.readByEvent as jest.Mock).mockResolvedValue(intents);

    const eventId = mockEventId;
    const result = await resolver.readIntentsByEvent(eventId);

    expect(IntentDAO.readByEvent).toHaveBeenCalledWith(eventId);
    expect(result).toBe(intents);
  });
});
