import 'reflect-metadata';
import { IntentResolver } from '@/graphql/resolvers/intent';
import { IntentDAO } from '@/mongodb/dao';
import type { Intent, UpsertIntentInput, User } from '@gatherle/commons/types';
import { IntentStatus, IntentVisibility, IntentSource, UserRole } from '@gatherle/commons/types';
import { Types } from 'mongoose';
import type { ServerContext } from '@/graphql';

jest.mock('@/mongodb/dao', () => ({
  IntentDAO: {
    upsert: jest.fn(),
    readByUser: jest.fn(),
    readByEvent: jest.fn(),
  },
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

  const mockContext: Partial<ServerContext> = {
    user: mockUser,
  };

  beforeEach(() => {
    resolver = new IntentResolver();
    jest.clearAllMocks();
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

    const result = await resolver.upsertIntent(mockInput, mockContext as ServerContext);

    expect(IntentDAO.upsert).toHaveBeenCalledWith({ ...mockInput, userId: mockUser.userId });
    expect(result).toEqual(mockIntent);
  });

  it('reads intents by user', async () => {
    const mockIntents: Intent[] = [];
    (IntentDAO.readByUser as jest.Mock).mockResolvedValue(mockIntents);

    const result = await resolver.readIntentsByUser(mockContext as ServerContext);
    expect(IntentDAO.readByUser).toHaveBeenCalledWith(mockUser.userId);
    expect(result).toBe(mockIntents);
  });

  it('reads event intents', async () => {
    const intents: Intent[] = [];
    (IntentDAO.readByEvent as jest.Mock).mockResolvedValue(intents);

    const eventId = mockEventId;
    const result = await resolver.readIntentsByEvent(eventId, mockContext as ServerContext);

    expect(IntentDAO.readByEvent).toHaveBeenCalledWith(eventId);
    expect(result).toBe(intents);
  });
});
