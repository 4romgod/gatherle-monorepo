// Mocks must come before any imports that trigger the module graph.
jest.mock('@/constants', () => ({
  CF_IMAGES_DOMAIN: 'cdn.example.com',
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
  GRAPHQL_API_PATH: '/v1/graphql',
  HttpStatusCode: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHENTICATED: 401,
    UNAUTHORIZED: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
}));

jest.mock('@/utils', () => ({
  CustomError: jest.fn((message: string, errorType: any) => {
    const error = new Error(message) as any;
    error.extensions = { code: errorType?.errorCode, http: { status: errorType?.errorStatus } };
    return error;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: { errorCode: 'BAD_USER_INPUT', errorStatus: 400 },
    NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
    UNAUTHORIZED: { errorCode: 'UNAUTHORIZED', errorStatus: 403 },
    INTERNAL_SERVER_ERROR: { errorCode: 'INTERNAL_SERVER_ERROR', errorStatus: 500 },
  },
}));

jest.mock('@/mongodb/dao', () => ({
  EventMomentDAO: {
    create: jest.fn(),
    readById: jest.fn(),
    readByEvent: jest.fn(),
    readByAuthorAndEvent: jest.fn(),
    readFollowedStatuses: jest.fn(),
    countRecentByAuthor: jest.fn(),
    delete: jest.fn(),
  },
  EventDAO: {
    readEventById: jest.fn(),
  },
  EventParticipantDAO: {
    readByEventAndUser: jest.fn(),
  },
  FollowDAO: {
    readFollowingForUser: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

// The service imports POSTING_WINDOW_HOURS_AFTER_EVENT and MAX_STATUSES_PER_WINDOW directly
// from the DAO module file (not from the barrel), so mock that module separately.
jest.mock('@/mongodb/dao/eventMoment', () => ({
  POSTING_WINDOW_HOURS_AFTER_EVENT: 48,
  MAX_STATUSES_PER_WINDOW: 5,
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import EventMomentService from '@/services/eventMoment';
import { EventMomentDAO, EventDAO, EventParticipantDAO, FollowDAO, UserDAO } from '@/mongodb/dao';
import type { EventMoment, EventMomentPage } from '@gatherle/commons/types';
import {
  EventMomentState,
  EventMomentType,
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
} from '@gatherle/commons/types';

describe('EventMomentService', () => {
  const now = Date.now();
  /** Event still running — posting window is open */
  const futureEndDate = new Date(now + 2 * 60 * 60 * 1000);
  /** Event ended 50 h ago — 48 h window has closed */
  const closedEndDate = new Date(now - 50 * 60 * 60 * 1000);

  const mockEvent = {
    eventId: 'event-1',
    title: 'Test Event',
    primarySchedule: { endAt: futureEndDate },
    organizers: [{ user: 'organizer-1' }],
  };

  const mockMoment: EventMoment = {
    momentId: 'moment-1',
    eventId: 'event-1',
    authorId: 'user-1',
    type: EventMomentType.Text,
    state: EventMomentState.Ready,
    expiresAt: new Date(now + 24 * 60 * 60 * 1000),
    createdAt: new Date(now),
  };

  const mockGoingParticipant = {
    participantId: 'p-1',
    eventId: 'event-1',
    userId: 'user-1',
    status: ParticipantStatus.Going,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    (EventDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
    (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockGoingParticipant);
    (EventMomentDAO.countRecentByAuthor as jest.Mock).mockResolvedValue(0);
    (EventMomentDAO.create as jest.Mock).mockResolvedValue(mockMoment);
  });

  describe('create', () => {
    const textInput = { eventId: 'event-1', type: EventMomentType.Text };

    it('creates a text moment successfully', async () => {
      const result = await EventMomentService.create(textInput, 'user-1');

      expect(EventMomentDAO.create).toHaveBeenCalledWith(textInput, 'user-1', undefined, undefined);
      expect(result).toEqual(mockMoment);
    });

    it('builds a CloudFront mediaUrl for an image moment', async () => {
      const imageInput = {
        eventId: 'event-1',
        type: EventMomentType.Image,
        mediaKey: 'uploads/img.jpg',
      };

      await EventMomentService.create(imageInput, 'user-1');

      expect(EventMomentDAO.create).toHaveBeenCalledWith(
        imageInput,
        'user-1',
        'https://cdn.example.com/uploads/img.jpg',
        undefined,
      );
    });

    it('does not set mediaUrl for a video without mediaKey (Processing path)', async () => {
      const videoInput = { eventId: 'event-1', type: EventMomentType.Video };

      await EventMomentService.create(videoInput, 'user-1');

      expect(EventMomentDAO.create).toHaveBeenCalledWith(videoInput, 'user-1', undefined, undefined);
    });

    it('builds thumbnailUrl when thumbnailKey is provided', async () => {
      const inputWithThumb = {
        eventId: 'event-1',
        type: EventMomentType.Image,
        mediaKey: 'uploads/img.jpg',
        thumbnailKey: 'uploads/thumb.jpg',
      };

      await EventMomentService.create(inputWithThumb, 'user-1');

      expect(EventMomentDAO.create).toHaveBeenCalledWith(
        inputWithThumb,
        'user-1',
        'https://cdn.example.com/uploads/img.jpg',
        'https://cdn.example.com/uploads/thumb.jpg',
      );
    });

    it('builds thumbnailUrl without mediaUrl when only thumbnailKey is present on a text moment', async () => {
      const inputWithThumbOnly = {
        eventId: 'event-1',
        type: EventMomentType.Text,
        thumbnailKey: 'uploads/thumb.jpg',
      };

      await EventMomentService.create(inputWithThumbOnly, 'user-1');

      // Text moment has no mediaKey so mediaUrl is undefined; thumbnailKey still builds thumbnailUrl.
      expect(EventMomentDAO.create).toHaveBeenCalledWith(
        inputWithThumbOnly,
        'user-1',
        undefined,
        'https://cdn.example.com/uploads/thumb.jpg',
      );
    });

    it('allows a CheckedIn participant to post', async () => {
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue({
        ...mockGoingParticipant,
        status: ParticipantStatus.CheckedIn,
      });

      const result = await EventMomentService.create(textInput, 'user-1');

      expect(result).toEqual(mockMoment);
    });

    it('throws NOT_FOUND when the event does not exist', async () => {
      (EventDAO.readEventById as jest.Mock).mockRejectedValue(new Error('not found'));

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'Event not found',
      });
    });

    it('throws BAD_USER_INPUT when the posting window has closed', async () => {
      (EventDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        primarySchedule: { endAt: closedEndDate },
      });

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'The posting window for this event has closed',
      });
    });

    it('throws BAD_USER_INPUT when caller has no RSVP', async () => {
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'You must RSVP as Going or CheckedIn to post a moment',
      });
    });

    it('throws BAD_USER_INPUT when RSVP status is Interested', async () => {
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue({
        ...mockGoingParticipant,
        status: ParticipantStatus.Interested,
      });

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'You must RSVP as Going or CheckedIn to post a moment',
      });
    });

    it('throws BAD_USER_INPUT when rate limit is reached', async () => {
      (EventMomentDAO.countRecentByAuthor as jest.Mock).mockResolvedValue(5);

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: expect.stringContaining('5 moments per event'),
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(mockMoment);
      (EventMomentDAO.delete as jest.Mock).mockResolvedValue(true);
    });

    it('author can delete their own moment', async () => {
      const result = await EventMomentService.delete('moment-1', 'user-1');

      expect(EventMomentDAO.delete).toHaveBeenCalledWith('moment-1');
      expect(result).toBe(true);
    });

    it('throws NOT_FOUND when moment does not exist', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(null);

      await expect(EventMomentService.delete('moment-1', 'user-1')).rejects.toMatchObject({
        message: 'Moment not found',
      });
    });

    it('event organizer can delete a moment from their event', async () => {
      const othersMoment = { ...mockMoment, authorId: 'other-user' };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(othersMoment);
      (EventDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        organizers: [{ user: 'organizer-1' }],
      });

      const result = await EventMomentService.delete('moment-1', 'organizer-1');

      expect(EventMomentDAO.delete).toHaveBeenCalledWith('moment-1');
      expect(result).toBe(true);
    });

    it('throws UNAUTHORIZED when caller is neither author nor organizer', async () => {
      const othersMoment = { ...mockMoment, authorId: 'other-user' };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(othersMoment);
      (EventDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        organizers: [{ user: 'organizer-1' }],
      });

      await expect(EventMomentService.delete('moment-1', 'random-user')).rejects.toMatchObject({
        message: 'You are not authorized to delete this moment',
      });
    });

    it('throws UNAUTHORIZED when event not found and caller is not author', async () => {
      const othersMoment = { ...mockMoment, authorId: 'other-user' };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(othersMoment);
      (EventDAO.readEventById as jest.Mock).mockRejectedValue(new Error('not found'));

      await expect(EventMomentService.delete('moment-1', 'random-user')).rejects.toMatchObject({
        message: 'You are not authorized to delete this moment',
      });
    });
  });

  describe('readByEvent', () => {
    it('delegates to EventMomentDAO.readByEvent', async () => {
      const page: EventMomentPage = { items: [mockMoment], hasMore: false };
      (EventMomentDAO.readByEvent as jest.Mock).mockResolvedValue(page);

      const result = await EventMomentService.readByEvent('event-1', undefined, 10);

      expect(EventMomentDAO.readByEvent).toHaveBeenCalledWith('event-1', undefined, 10);
      expect(result).toEqual(page);
    });
  });

  describe('readUserMoments', () => {
    const publicUser = { userId: 'user-2', followPolicy: 'Open' };
    const privateUser = { userId: 'user-2', followPolicy: 'RequireApproval' };

    beforeEach(() => {
      (EventMomentDAO.readByAuthorAndEvent as jest.Mock).mockResolvedValue([mockMoment]);
    });

    it('own profile passes includeProcessing=true to the DAO', async () => {
      await EventMomentService.readUserMoments('user-1', 'event-1', 'user-1');

      expect(EventMomentDAO.readByAuthorAndEvent).toHaveBeenCalledWith('user-1', 'event-1', true);
    });

    it('public profile passes includeProcessing=false to the DAO', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(publicUser);

      const result = await EventMomentService.readUserMoments('user-2', 'event-1', 'user-1');

      expect(EventMomentDAO.readByAuthorAndEvent).toHaveBeenCalledWith('user-2', 'event-1', false);
      expect(result).toEqual([mockMoment]);
    });

    it('private profile with accepted follow returns moments', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateUser);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'user-2',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);

      const result = await EventMomentService.readUserMoments('user-2', 'event-1', 'user-1');

      expect(result).toEqual([mockMoment]);
    });

    it('private profile with no follow returns empty array silently', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateUser);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);

      const result = await EventMomentService.readUserMoments('user-2', 'event-1', 'user-1');

      expect(result).toEqual([]);
      expect(EventMomentDAO.readByAuthorAndEvent).not.toHaveBeenCalled();
    });

    it('private profile with pending (not accepted) follow returns empty array', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateUser);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'user-2',
          approvalStatus: FollowApprovalStatus.Pending,
        },
      ]);

      const result = await EventMomentService.readUserMoments('user-2', 'event-1', 'user-1');

      expect(result).toEqual([]);
    });

    it('returns empty array silently when target user is not found', async () => {
      (UserDAO.readUserById as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await EventMomentService.readUserMoments('unknown-user', 'event-1', 'user-1');

      expect(result).toEqual([]);
    });
  });

  describe('readFollowedMoments', () => {
    it('returns empty page when caller follows nobody', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);

      const result = await EventMomentService.readFollowedMoments('user-1');

      expect(EventMomentDAO.readFollowedStatuses).not.toHaveBeenCalled();
      expect(result).toEqual({ items: [], hasMore: false });
    });

    it('delegates to DAO with the followed user IDs', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        { targetType: FollowTargetType.User, targetId: 'user-2' },
        { targetType: FollowTargetType.User, targetId: 'user-3' },
      ]);
      const page: EventMomentPage = { items: [mockMoment], hasMore: false };
      (EventMomentDAO.readFollowedStatuses as jest.Mock).mockResolvedValue(page);

      const result = await EventMomentService.readFollowedMoments('user-1', undefined, 10);

      expect(EventMomentDAO.readFollowedStatuses).toHaveBeenCalledWith(['user-2', 'user-3'], undefined, 10);
      expect(result).toEqual(page);
    });

    it('ignores non-User follow targets (e.g. organizations)', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        { targetType: FollowTargetType.Organization, targetId: 'org-1' },
      ]);

      const result = await EventMomentService.readFollowedMoments('user-1');

      expect(EventMomentDAO.readFollowedStatuses).not.toHaveBeenCalled();
      expect(result).toEqual({ items: [], hasMore: false });
    });
  });
});
