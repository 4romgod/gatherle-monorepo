import 'reflect-metadata';
import { EventMomentResolver } from '@/graphql/resolvers/eventMoment';
import { EventMomentService } from '@/services';
import { getAuthenticatedUser } from '@/utils';
import { validateInput } from '@/validation';
import { EventMomentType, EventMomentState } from '@gatherle/commons/types';

jest.mock('@/services', () => ({
  EventMomentService: {
    create: jest.fn(),
    delete: jest.fn(),
    readByEvent: jest.fn(),
    readUserMoments: jest.fn(),
    readFollowedMoments: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/validation', () => ({
  validateInput: jest.fn(),
}));

jest.mock('@/validation/zod', () => ({
  CreateEventMomentInputSchema: {},
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockMoment = {
  momentId: 'moment-1',
  eventId: 'event-1',
  authorId: 'user-1',
  type: EventMomentType.Text,
  state: EventMomentState.Ready,
  expiresAt: new Date(),
  createdAt: new Date(),
};

const mockContext = {
  loaders: {
    user: {
      load: jest.fn(async (id: string) => ({ userId: id }) as any),
    },
  },
} as any;

describe('EventMomentResolver', () => {
  let resolver: EventMomentResolver;

  beforeEach(() => {
    resolver = new EventMomentResolver();
    jest.clearAllMocks();
    (getAuthenticatedUser as jest.Mock).mockReturnValue({ userId: 'user-1' });
  });

  describe('author field resolver', () => {
    it('loads the author via the user DataLoader', async () => {
      const result = await resolver.author(mockMoment as any, mockContext);

      expect(mockContext.loaders.user.load).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('returns null when authorId is falsy', async () => {
      const result = await resolver.author({ ...mockMoment, authorId: '' } as any, mockContext);

      expect(mockContext.loaders.user.load).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null when the user loader throws', async () => {
      (mockContext.loaders.user.load as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await resolver.author(mockMoment as any, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('createEventMoment', () => {
    const input = { eventId: 'event-1', type: EventMomentType.Text, caption: 'Hello!' };

    it('validates input and delegates to EventMomentService.create', async () => {
      (EventMomentService.create as jest.Mock).mockResolvedValue(mockMoment);

      const result = await resolver.createEventMoment(input as any, mockContext);

      expect(validateInput).toHaveBeenCalledWith(expect.anything(), input);
      expect(EventMomentService.create).toHaveBeenCalledWith(input, 'user-1');
      expect(result).toEqual(mockMoment);
    });

    it('propagates service errors', async () => {
      (EventMomentService.create as jest.Mock).mockRejectedValue(new Error('window closed'));

      await expect(resolver.createEventMoment(input as any, mockContext)).rejects.toThrow('window closed');
    });
  });

  describe('deleteEventMoment', () => {
    it('delegates to EventMomentService.delete with authenticated caller', async () => {
      (EventMomentService.delete as jest.Mock).mockResolvedValue(true);

      const result = await resolver.deleteEventMoment('moment-1', mockContext);

      expect(EventMomentService.delete).toHaveBeenCalledWith('moment-1', 'user-1');
      expect(result).toBe(true);
    });

    it('propagates service errors', async () => {
      (EventMomentService.delete as jest.Mock).mockRejectedValue(new Error('not authorized'));

      await expect(resolver.deleteEventMoment('moment-1', mockContext)).rejects.toThrow('not authorized');
    });
  });

  describe('readEventMoments', () => {
    it('delegates to EventMomentService.readByEvent', async () => {
      const page = { items: [mockMoment], hasMore: false };
      (EventMomentService.readByEvent as jest.Mock).mockResolvedValue(page);

      const result = await resolver.readEventMoments('event-1', mockContext, 'cursor-1', 10);

      expect(EventMomentService.readByEvent).toHaveBeenCalledWith('event-1', 'cursor-1', 10);
      expect(result).toEqual(page);
    });

    it('passes undefined cursor and limit when not provided', async () => {
      const page = { items: [], hasMore: false };
      (EventMomentService.readByEvent as jest.Mock).mockResolvedValue(page);

      await resolver.readEventMoments('event-1', mockContext);

      expect(EventMomentService.readByEvent).toHaveBeenCalledWith('event-1', undefined, undefined);
    });
  });

  describe('readUserEventMoments', () => {
    it('delegates to EventMomentService.readUserMoments with authenticated caller', async () => {
      (EventMomentService.readUserMoments as jest.Mock).mockResolvedValue([mockMoment]);

      const result = await resolver.readUserEventMoments('user-2', 'event-1', mockContext);

      expect(EventMomentService.readUserMoments).toHaveBeenCalledWith('user-2', 'event-1', 'user-1');
      expect(result).toEqual([mockMoment]);
    });
  });

  describe('readFollowedMoments', () => {
    it('delegates to EventMomentService.readFollowedMoments with authenticated caller', async () => {
      const page = { items: [mockMoment], hasMore: false };
      (EventMomentService.readFollowedMoments as jest.Mock).mockResolvedValue(page);

      const result = await resolver.readFollowedMoments(mockContext, 'cursor-1', 20);

      expect(EventMomentService.readFollowedMoments).toHaveBeenCalledWith('user-1', 'cursor-1', 20);
      expect(result).toEqual(page);
    });

    it('passes undefined cursor and limit when not provided', async () => {
      const page = { items: [], hasMore: false };
      (EventMomentService.readFollowedMoments as jest.Mock).mockResolvedValue(page);

      await resolver.readFollowedMoments(mockContext);

      expect(EventMomentService.readFollowedMoments).toHaveBeenCalledWith('user-1', undefined, undefined);
    });
  });
});
