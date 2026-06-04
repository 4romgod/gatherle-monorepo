// Mocks must come before any imports that trigger the module graph.
jest.mock('@/constants', () => {
  const actual = jest.requireActual('@/constants');
  return {
    ...actual,
    MEDIA_CDN_DOMAIN: 'cdn.example.com',
    AWS_REGION: 'eu-west-1',
    STAGE: 'Dev',
    MONGO_DB_URL: 'mock-url',
    JWT_SECRET: 'test-secret',
    SECRET_ARN: undefined,
    LOG_LEVEL: 1,
    LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
    LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
    GRAPHQL_API_PATH: '/v1/graphql',
    MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES: 75 * 1024 * 1024,
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
  };
});

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
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
  };
});

jest.mock('@/mongodb/dao', () => ({
  EventMomentDAO: {
    create: jest.fn(),
    readById: jest.fn(),
    readByEvent: jest.fn(),
    readByAuthor: jest.fn(),
    readByAuthorAndEvent: jest.fn(),
    readFeedCandidates: jest.fn(),
    readFollowedStatuses: jest.fn(),
    countRecentByAuthor: jest.fn(),
    findByRawS3Key: jest.fn(),
    publishVideoMoment: jest.fn(),
    delete: jest.fn(),
  },
  EventOccurrenceDAO: {
    readByOccurrenceId: jest.fn(),
    readFirstByEventSeriesId: jest.fn(),
    readByEventSeriesIds: jest.fn(),
    readExceptionOccurrenceKeysByEventSeriesId: jest.fn(),
    bulkUpsert: jest.fn(),
    deleteMissingGeneratedOccurrences: jest.fn(),
  },
  EventOccurrenceParticipantDAO: {
    readByOccurrenceAndUser: jest.fn(),
  },
  FollowDAO: {
    readFollowingForUser: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
    readUsersByIds: jest.fn(),
  },
  EventSeriesDAO: {
    readEventById: jest.fn(),
    readEventsByIds: jest.fn(),
  },
}));

// The service imports POSTING_WINDOW_HOURS_AFTER_EVENT and MAX_STATUSES_PER_WINDOW directly
// from the DAO module file (not from the barrel), so mock that module separately.
jest.mock('@/mongodb/dao/eventMoment', () => ({
  POSTING_WINDOW_HOURS_AFTER_EVENT: 72,
  MAX_STATUSES_PER_WINDOW: 5,
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4, debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

jest.mock('@/services/eventMomentRealtime', () => ({
  publishMomentCreatedForScopedRecipients: jest.fn().mockResolvedValue(undefined),
  publishMomentDeletedForScopedRecipients: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/clients/AWS/s3Client', () => ({
  getS3ObjectSize: jest.fn().mockResolvedValue(1000),
}));

import EventMomentService from '@/services/eventMoment';
import {
  EventMomentDAO,
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  FollowDAO,
  UserDAO,
} from '@/mongodb/dao';
import { getS3ObjectSize } from '@/clients/AWS/s3Client';
import {
  publishMomentCreatedForScopedRecipients,
  publishMomentDeletedForScopedRecipients,
} from '@/services/eventMomentRealtime';
import { EVENT_MOMENT_EXPIRY_MS } from '@gatherle/commons/server/constants';
import type { EventMoment, EventMomentPage } from '@gatherle/commons/server/types';
import {
  EventMomentState,
  EventMomentType,
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
} from '@gatherle/commons/server/types';

describe('EventMomentService', () => {
  const now = Date.now();
  /** EventSeries still running — posting window is open */
  const futureEndDate = new Date(now + 2 * 60 * 60 * 1000);
  /** EventSeries ended 74 h ago — 72 h window has closed */
  const closedEndDate = new Date(now - 74 * 60 * 60 * 1000);

  const mockAuthor = {
    userId: 'user-1',
    username: 'alice',
    given_name: 'Alice',
    family_name: 'Smith',
    profile_picture: null,
  };

  const mockEvent = {
    eventId: 'event-1',
    slug: 'test-eventseries',
    title: 'Test EventSeries',
    primarySchedule: { endAt: futureEndDate },
    organizers: [{ user: 'organizer-1' }],
  };

  const mockMoment: EventMoment = {
    momentId: 'moment-1',
    eventId: 'event-1',
    occurrenceId: 'event-1#2099-01-01T00:00:00.000Z',
    authorId: 'user-1',
    type: EventMomentType.Text,
    state: EventMomentState.Ready,
    isPublished: true,
    expiresAt: new Date(now + EVENT_MOMENT_EXPIRY_MS),
    createdAt: new Date(now),
  };

  const mockReservedVideoMoment: EventMoment = {
    ...mockMoment,
    momentId: 'video-moment-1',
    type: EventMomentType.Video,
    state: EventMomentState.UploadPending,
    rawS3Key: 'uploads/clip.mp4',
    mediaUrl: 'https://cdn.example.com/uploads/clip.mp4',
    isPublished: false,
  };

  const mockPublishedVideoMoment: EventMoment = {
    ...mockReservedVideoMoment,
    state: EventMomentState.Transcoding,
    caption: 'Video caption',
    thumbnailUrl: 'https://cdn.example.com/uploads/thumb.jpg',
    isPublished: true,
  };

  const mockGoingParticipant = {
    participantId: 'p-1',
    occurrenceId: 'event-1#2099-01-01T00:00:00.000Z',
    userId: 'user-1',
    status: ParticipantStatus.Going,
  };

  const mockOccurrence = {
    occurrenceId: 'event-1#2099-01-01T00:00:00.000Z',
    eventSeriesId: 'event-1',
    startAt: futureEndDate,
    endAt: futureEndDate,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(mockOccurrence);
    (EventOccurrenceDAO.readFirstByEventSeriesId as jest.Mock).mockResolvedValue(mockOccurrence);
    (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock).mockResolvedValue([]);
    (EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId as jest.Mock).mockResolvedValue([]);
    (EventOccurrenceDAO.bulkUpsert as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceDAO.deleteMissingGeneratedOccurrences as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(mockGoingParticipant);
    (EventMomentDAO.countRecentByAuthor as jest.Mock).mockResolvedValue(0);
    (EventMomentDAO.create as jest.Mock).mockResolvedValue(mockMoment);
    (EventMomentDAO.readById as jest.Mock).mockResolvedValue(mockReservedVideoMoment);
    (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue(mockReservedVideoMoment);
    (EventMomentDAO.publishVideoMoment as jest.Mock).mockResolvedValue(mockPublishedVideoMoment);
    (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockAuthor);
    (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([]);
    (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([]);
    (getS3ObjectSize as jest.Mock).mockResolvedValue(1000);
  });

  describe('create', () => {
    const textInput = { eventId: 'event-1', type: EventMomentType.Text };

    it('creates a text moment successfully', async () => {
      const result = await EventMomentService.create(textInput, 'user-1');
      await new Promise((resolve) => setImmediate(resolve));

      expect(EventMomentDAO.create).toHaveBeenCalledWith(
        textInput,
        'user-1',
        undefined,
        undefined,
        mockOccurrence.occurrenceId,
      );
      expect(result).toEqual(mockMoment);
      expect(publishMomentCreatedForScopedRecipients).toHaveBeenCalledWith(mockMoment);
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
        mockOccurrence.occurrenceId,
      );
      expect(getS3ObjectSize).not.toHaveBeenCalled();
    });

    it('publishes a reserved video moment after verifying the uploaded object size', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
        mediaKey: 'uploads/clip.mp4',
        thumbnailKey: 'uploads/thumb.jpg',
        caption: 'Video caption',
      };

      const result = await EventMomentService.create(videoInput, 'user-1');
      await new Promise((resolve) => setImmediate(resolve));

      expect(getS3ObjectSize).toHaveBeenCalledWith('uploads/clip.mp4');
      expect(EventMomentDAO.publishVideoMoment).toHaveBeenCalledWith('video-moment-1', {
        eventId: 'event-1',
        authorId: 'user-1',
        caption: 'Video caption',
        thumbnailUrl: 'https://cdn.example.com/uploads/thumb.jpg',
      });
      expect(EventMomentDAO.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockPublishedVideoMoment);
      expect(publishMomentCreatedForScopedRecipients).toHaveBeenCalledWith(mockPublishedVideoMoment);
    });

    it('rejects a video moment without a reserved momentId', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        mediaKey: 'uploads/clip.mp4',
      };

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'Use getEventMomentUploadUrl before creating a video moment.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
    });

    it('rejects a video moment without a mediaKey', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
      };

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'mediaKey is required for video moments.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
    });

    it('skips S3 size verification when the reserved video is already Ready', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce({
        ...mockReservedVideoMoment,
        state: EventMomentState.Ready,
      });

      await EventMomentService.create(
        {
          eventId: 'event-1',
          type: EventMomentType.Video,
          momentId: 'video-moment-1',
          mediaKey: 'uploads/clip.mp4',
        },
        'user-1',
      );

      expect(getS3ObjectSize).not.toHaveBeenCalled();
    });

    it('rejects a video moment when the uploaded object exceeds 75 MB', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
        mediaKey: 'uploads/oversized.mp4',
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce({
        ...mockReservedVideoMoment,
        rawS3Key: 'uploads/oversized.mp4',
      });
      (getS3ObjectSize as jest.Mock).mockResolvedValueOnce(75 * 1024 * 1024 + 1);

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'Video must be 75 MB or smaller.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
    });

    it('rejects a video moment when the uploaded object has already been deleted', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
        mediaKey: 'uploads/deleted.mp4',
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce({
        ...mockReservedVideoMoment,
        rawS3Key: 'uploads/deleted.mp4',
      });
      const notFoundError = Object.assign(new Error('not found'), {
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });
      (getS3ObjectSize as jest.Mock).mockRejectedValueOnce(notFoundError);

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'Uploaded video file was not found. Please upload again.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
    });

    it('rejects a video moment when S3 does not return a content length', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
        mediaKey: 'uploads/unknown-size.mp4',
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce({
        ...mockReservedVideoMoment,
        rawS3Key: 'uploads/unknown-size.mp4',
      });
      (getS3ObjectSize as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'Uploaded video file size could not be verified. Please upload again.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
    });

    it('rejects a video moment without a reservation', async () => {
      const videoInput = {
        eventId: 'event-1',
        type: EventMomentType.Video,
        momentId: 'video-moment-1',
        mediaKey: 'uploads/clip.mp4',
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce(null);

      await expect(EventMomentService.create(videoInput, 'user-1')).rejects.toMatchObject({
        message: 'Video upload reservation not found. Please upload again.',
      });
      expect(EventMomentDAO.create).not.toHaveBeenCalled();
    });

    it('rejects a failed reserved video moment', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValueOnce({
        ...mockReservedVideoMoment,
        state: EventMomentState.Failed,
      });

      await expect(
        EventMomentService.create(
          {
            eventId: 'event-1',
            type: EventMomentType.Video,
            momentId: 'video-moment-1',
            mediaKey: 'uploads/clip.mp4',
          },
          'user-1',
        ),
      ).rejects.toMatchObject({
        message: 'Uploaded video failed processing. Please upload again.',
      });
      expect(EventMomentDAO.publishVideoMoment).not.toHaveBeenCalled();
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
        mockOccurrence.occurrenceId,
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
        mockOccurrence.occurrenceId,
      );
    });

    it('allows a CheckedIn participant to post', async () => {
      (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue({
        ...mockGoingParticipant,
        status: ParticipantStatus.CheckedIn,
      });

      const result = await EventMomentService.create(textInput, 'user-1');

      expect(result).toEqual(mockMoment);
    });

    it('throws NOT_FOUND when the event does not exist', async () => {
      (EventSeriesDAO.readEventById as jest.Mock).mockRejectedValue(new Error('not found'));

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'EventSeries not found',
      });
    });

    it('throws BAD_USER_INPUT when the posting window has closed', async () => {
      (EventOccurrenceDAO.readFirstByEventSeriesId as jest.Mock).mockResolvedValue({
        ...mockOccurrence,
        startAt: closedEndDate,
        endAt: closedEndDate,
      });

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'The posting window for this event has closed',
      });
    });

    it('throws BAD_USER_INPUT when caller has no RSVP', async () => {
      (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(null);

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'You must RSVP as Going or CheckedIn to post a moment',
      });
    });

    it('throws NOT_FOUND when the backing event occurrence cannot be resolved', async () => {
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({ ...mockEvent, primarySchedule: null });
      (EventOccurrenceDAO.readFirstByEventSeriesId as jest.Mock).mockResolvedValue(null);

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: 'Event occurrence not found for this event.',
      });
      expect(EventOccurrenceParticipantDAO.readByOccurrenceAndUser).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT when RSVP status is Interested', async () => {
      (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue({
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

    it('rejects recurring event series when no occurrence is targeted', async () => {
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        primarySchedule: {
          startAt: futureEndDate,
          endAt: futureEndDate,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20990101T000000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TH',
        },
      });

      await expect(EventMomentService.create(textInput, 'user-1')).rejects.toMatchObject({
        message: expect.stringContaining('requires occurrence targeting'),
      });
    });

    it('allows recurring event series posting when a concrete occurrence is targeted', async () => {
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        primarySchedule: {
          startAt: futureEndDate,
          endAt: futureEndDate,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20990101T000000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TH',
        },
      });

      const input = {
        ...textInput,
        occurrenceId: mockOccurrence.occurrenceId,
      };

      await EventMomentService.create(input, 'user-1');

      expect(EventOccurrenceDAO.readByOccurrenceId).toHaveBeenCalledWith(mockOccurrence.occurrenceId);
      expect(EventMomentDAO.create).toHaveBeenCalledWith(
        input,
        'user-1',
        undefined,
        undefined,
        mockOccurrence.occurrenceId,
      );
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
      expect(publishMomentDeletedForScopedRecipients).toHaveBeenCalledWith(mockMoment);
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
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        organizers: [{ user: 'organizer-1' }],
      });

      const result = await EventMomentService.delete('moment-1', 'organizer-1');

      expect(EventMomentDAO.delete).toHaveBeenCalledWith('moment-1');
      expect(result).toBe(true);
      expect(publishMomentDeletedForScopedRecipients).toHaveBeenCalledWith(othersMoment, {
        ...mockEvent,
        organizers: [{ user: 'organizer-1' }],
      });
    });

    it('throws UNAUTHORIZED when caller is neither author nor organizer', async () => {
      const othersMoment = { ...mockMoment, authorId: 'other-user' };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(othersMoment);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({
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
      (EventSeriesDAO.readEventById as jest.Mock).mockRejectedValue(new Error('not found'));

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

      expect(EventMomentDAO.readByEvent).toHaveBeenCalledWith('event-1', undefined, 10, undefined);
      expect(result).toEqual(page);
    });
  });

  describe('readUserMoments', () => {
    const publicUser = { userId: 'user-2', followPolicy: 'Open' };
    const privateUser = { userId: 'user-2', followPolicy: 'RequireApproval' };

    beforeEach(() => {
      (EventMomentDAO.readByAuthorAndEvent as jest.Mock).mockResolvedValue([mockMoment]);
    });

    it('own profile passes includePending=true to the DAO', async () => {
      await EventMomentService.readUserMoments('user-1', 'event-1', 'user-1');

      expect(EventMomentDAO.readByAuthorAndEvent).toHaveBeenCalledWith('user-1', 'event-1', true);
    });

    it('public profile passes includePending=false to the DAO', async () => {
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

  describe('readUserMomentsFeed', () => {
    const publicUser = { userId: 'user-2', followPolicy: 'Public' };
    const privateUser = { userId: 'user-2', followPolicy: 'RequireApproval' };

    beforeEach(() => {
      const page: EventMomentPage = { items: [mockMoment], hasMore: false };
      (EventMomentDAO.readByAuthor as jest.Mock).mockResolvedValue(page);
    });

    it('own profile passes includePending=true to the DAO', async () => {
      await EventMomentService.readUserMomentsFeed('user-1', 'user-1');

      expect(EventMomentDAO.readByAuthor).toHaveBeenCalledWith('user-1', true, undefined, undefined);
    });

    it('public profile passes includePending=false to the DAO', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(publicUser);

      const result = await EventMomentService.readUserMomentsFeed('user-2', 'user-1');

      expect(EventMomentDAO.readByAuthor).toHaveBeenCalledWith('user-2', false, undefined, undefined);
      expect(result).toEqual({ items: [mockMoment], hasMore: false });
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

      const result = await EventMomentService.readUserMomentsFeed('user-2', 'user-1');

      expect(result).toEqual({ items: [mockMoment], hasMore: false });
    });

    it('private profile with no follow returns empty page silently', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateUser);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);

      const result = await EventMomentService.readUserMomentsFeed('user-2', 'user-1');

      expect(result).toEqual({ items: [], hasMore: false });
      expect(EventMomentDAO.readByAuthor).not.toHaveBeenCalled();
    });

    it('private profile with anonymous viewer returns empty page', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateUser);

      const result = await EventMomentService.readUserMomentsFeed('user-2');

      expect(result).toEqual({ items: [], hasMore: false });
      expect(EventMomentDAO.readByAuthor).not.toHaveBeenCalled();
    });

    it('returns empty page silently when target user is not found', async () => {
      (UserDAO.readUserById as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await EventMomentService.readUserMomentsFeed('unknown-user', 'user-1');

      expect(result).toEqual({ items: [], hasMore: false });
      expect(EventMomentDAO.readByAuthor).not.toHaveBeenCalled();
    });
  });

  describe('readMomentById', () => {
    const publicAuthor = { userId: 'user-2', followPolicy: 'Public' };
    const privateAuthor = { userId: 'user-2', followPolicy: 'RequireApproval' };

    it('returns null when the moment is expired', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue({
        ...mockMoment,
        expiresAt: new Date(now - 60_000),
      });

      const result = await EventMomentService.readMomentById('moment-1', 'user-1');

      expect(result).toBeNull();
    });

    it('returns the moment for the author even when it is not published and not ready', async () => {
      const pendingOwnMoment = {
        ...mockReservedVideoMoment,
        authorId: 'user-1',
        state: EventMomentState.UploadPending,
        isPublished: false,
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(pendingOwnMoment);

      const result = await EventMomentService.readMomentById('moment-1', 'user-1');

      expect(result).toEqual(pendingOwnMoment);
    });

    it('returns null when a non-owner tries to read an unpublished ready moment', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue({
        ...mockMoment,
        authorId: 'user-2',
        isPublished: false,
      });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(publicAuthor);

      const result = await EventMomentService.readMomentById('moment-1', 'user-1');

      expect(result).toBeNull();
    });

    it('returns null when a private author is not viewable by the caller', async () => {
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue({
        ...mockMoment,
        authorId: 'user-2',
      });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateAuthor);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);

      const result = await EventMomentService.readMomentById('moment-1', 'user-1');

      expect(result).toBeNull();
    });

    it('returns a published ready moment when the caller may view the author', async () => {
      const visibleMoment = {
        ...mockMoment,
        authorId: 'user-2',
        isPublished: true,
        state: EventMomentState.Ready,
      };
      (EventMomentDAO.readById as jest.Mock).mockResolvedValue(visibleMoment);
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(privateAuthor);
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'user-2',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);

      const result = await EventMomentService.readMomentById('moment-1', 'user-1');

      expect(result).toEqual(visibleMoment);
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

  describe('readMomentsFeed', () => {
    const viewer = {
      userId: 'viewer-1',
      followPolicy: 'Public',
      interests: ['cat-music'],
      location: { city: 'Durban', country: 'South Africa' },
    };
    const publicAuthor = { userId: 'author-public', followPolicy: 'Public' };
    const privateAuthor = { userId: 'author-private', followPolicy: 'RequireApproval' };
    const publicEvent = {
      eventId: 'event-public',
      visibility: 'Public',
      orgId: 'org-public',
      eventCategories: ['cat-music'],
      location: { address: { city: 'Durban', country: 'South Africa' } },
    };
    const privateEvent = {
      eventId: 'event-private',
      visibility: 'Private',
      orgId: 'org-private',
      eventCategories: ['cat-music'],
      location: { address: { city: 'Durban', country: 'South Africa' } },
    };
    const publicMoment = {
      ...mockMoment,
      momentId: 'moment-public',
      authorId: 'author-public',
      eventId: 'event-public',
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
    };
    const privateAuthorMoment = {
      ...mockMoment,
      momentId: 'moment-private-author',
      authorId: 'author-private',
      eventId: 'event-public',
      createdAt: new Date('2026-05-15T07:00:00.000Z'),
    };
    const privateEventMoment = {
      ...mockMoment,
      momentId: 'moment-private-event',
      authorId: 'author-public',
      eventId: 'event-private',
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
    };

    beforeEach(() => {
      (EventMomentDAO.readFeedCandidates as jest.Mock).mockResolvedValue({
        items: [publicMoment, privateAuthorMoment, privateEventMoment],
        hasMore: true,
        nextCursor: '2026-05-15T06:00:00.000Z',
      });
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([]);
      (UserDAO.readUserById as jest.Mock).mockImplementation(async (userId: string) => {
        if (userId === 'viewer-1') return viewer;
        if (userId === 'author-public') return publicAuthor;
        if (userId === 'author-private') return privateAuthor;
        throw new Error('not found');
      });
      (UserDAO.readUsersByIds as jest.Mock).mockImplementation(async (userIds: string[]) =>
        userIds
          .map((userId) => {
            if (userId === 'author-public') return publicAuthor;
            if (userId === 'author-private') return privateAuthor;
            return null;
          })
          .filter(Boolean),
      );
      (EventSeriesDAO.readEventById as jest.Mock).mockImplementation(async (eventId: string) => {
        if (eventId === 'event-public') return publicEvent;
        if (eventId === 'event-private') return privateEvent;
        throw new Error('not found');
      });
      (EventSeriesDAO.readEventsByIds as jest.Mock).mockImplementation(async (eventIds: string[]) =>
        eventIds
          .map((eventId) => {
            if (eventId === 'event-public') return publicEvent;
            if (eventId === 'event-private') return privateEvent;
            return null;
          })
          .filter(Boolean),
      );
    });

    it('keeps all active moments in the feed for anonymous viewers and only uses ranking for order', async () => {
      const result = await EventMomentService.readMomentsFeed(undefined, undefined, 12);

      expect(EventMomentDAO.readFeedCandidates).toHaveBeenCalledWith(undefined, 72);
      expect(result.items.map((item) => item.momentId)).toEqual([
        'moment-public',
        'moment-private-author',
        'moment-private-event',
      ]);
      expect(result.hasMore).toBe(true);
      expect(typeof result.nextCursor).toBe('string');
    });

    it('still ranks accepted private-author moments highly for followed viewers without excluding other feed moments', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'author-private',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);
      const result = await EventMomentService.readMomentsFeed('viewer-1', undefined, 10);

      expect(result.items.map((item) => item.momentId)).toEqual([
        'moment-private-author',
        'moment-public',
        'moment-private-event',
      ]);
    });

    it('still ranks followed-author moments highly even when their event is not public without excluding other feed moments', async () => {
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'author-public',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);

      const result = await EventMomentService.readMomentsFeed('viewer-1', undefined, 10);

      expect(result.items.map((item) => item.momentId)).toEqual([
        'moment-public',
        'moment-private-event',
        'moment-private-author',
      ]);
    });

    it('prioritizes category matches over followed-author affinity', async () => {
      const followedAuthor = { userId: 'author-followed', followPolicy: 'Public' };
      const discoveryAuthor = { userId: 'author-discovery', followPolicy: 'Public' };
      const followedEvent = {
        ...publicEvent,
        eventId: 'event-followed',
        eventCategories: ['cat-food'],
      };
      const interestEvent = {
        ...publicEvent,
        eventId: 'event-interest',
        eventCategories: ['cat-music'],
      };
      const followedMoment = {
        ...publicMoment,
        momentId: 'moment-followed',
        authorId: 'author-followed',
        eventId: 'event-followed',
        createdAt: new Date('2026-05-15T09:00:00.000Z'),
      };
      const interestMoment = {
        ...publicMoment,
        momentId: 'moment-interest',
        authorId: 'author-discovery',
        eventId: 'event-interest',
        createdAt: new Date('2026-05-15T09:00:00.000Z'),
      };

      (EventMomentDAO.readFeedCandidates as jest.Mock).mockResolvedValue({
        items: [followedMoment, interestMoment],
        hasMore: false,
      });
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'author-followed',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);
      (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([followedAuthor, discoveryAuthor]);
      (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([followedEvent, interestEvent]);

      const result = await EventMomentService.readMomentsFeed('viewer-1', undefined, 10);

      expect(result.items.map((item) => item.momentId)).toEqual(['moment-interest', 'moment-followed']);
    });

    it('returns an empty page when no candidates are available', async () => {
      (EventMomentDAO.readFeedCandidates as jest.Mock).mockResolvedValue({
        items: [],
        hasMore: false,
      });

      const result = await EventMomentService.readMomentsFeed('viewer-1');

      expect(result).toEqual({ items: [], hasMore: false });
    });

    it('diversifies the feed when the same author dominates the candidate window', async () => {
      const dominantAuthor = { userId: 'author-dominant', followPolicy: 'Public' };
      const secondaryAuthor = { userId: 'author-secondary', followPolicy: 'Public' };
      const dominantOne = {
        ...publicMoment,
        momentId: 'dominant-1',
        authorId: 'author-dominant',
        eventId: 'event-public',
        createdAt: new Date('2026-05-15T09:00:00.000Z'),
      };
      const dominantTwo = {
        ...publicMoment,
        momentId: 'dominant-2',
        authorId: 'author-dominant',
        eventId: 'event-public',
        createdAt: new Date('2026-05-15T08:30:00.000Z'),
      };
      const dominantThree = {
        ...publicMoment,
        momentId: 'dominant-3',
        authorId: 'author-dominant',
        eventId: 'event-public',
        createdAt: new Date('2026-05-15T08:00:00.000Z'),
      };
      const secondaryMoment = {
        ...publicMoment,
        momentId: 'secondary-1',
        authorId: 'author-secondary',
        eventId: 'event-secondary',
        createdAt: new Date('2026-05-15T07:30:00.000Z'),
      };
      const secondaryEvent = {
        ...publicEvent,
        eventId: 'event-secondary',
      };

      (EventMomentDAO.readFeedCandidates as jest.Mock).mockResolvedValue({
        items: [dominantOne, dominantTwo, dominantThree, secondaryMoment],
        hasMore: false,
      });
      (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([dominantAuthor, secondaryAuthor]);
      (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([publicEvent, secondaryEvent]);

      const result = await EventMomentService.readMomentsFeed(undefined, undefined, 4);

      expect(result.items.map((item) => item.momentId)).toEqual([
        'dominant-1',
        'dominant-2',
        'secondary-1',
        'dominant-3',
      ]);
    });

    it('forces discovery back into the feed after two network-heavy items when available', async () => {
      const followedAuthorOne = { userId: 'author-followed-1', followPolicy: 'Public' };
      const followedAuthorTwo = { userId: 'author-followed-2', followPolicy: 'Public' };
      const followedAuthorThree = { userId: 'author-followed-3', followPolicy: 'Public' };
      const discoveryAuthor = { userId: 'author-discovery', followPolicy: 'Public' };
      const followedEventOne = {
        ...publicEvent,
        eventId: 'event-followed-1',
      };
      const followedEventTwo = {
        ...publicEvent,
        eventId: 'event-followed-2',
      };
      const followedEventThree = {
        ...publicEvent,
        eventId: 'event-followed-3',
      };
      const discoveryEvent = {
        ...publicEvent,
        eventId: 'event-discovery',
        orgId: 'org-discovery',
        eventCategories: ['cat-food'],
        location: { address: { city: 'Cape Town', country: 'South Africa' } },
      };
      const followedMomentOne = {
        ...publicMoment,
        momentId: 'followed-1',
        authorId: 'author-followed-1',
        eventId: 'event-followed-1',
        createdAt: new Date('2026-05-15T10:00:00.000Z'),
      };
      const followedMomentTwo = {
        ...publicMoment,
        momentId: 'followed-2',
        authorId: 'author-followed-2',
        eventId: 'event-followed-2',
        createdAt: new Date('2026-05-15T09:30:00.000Z'),
      };
      const followedMomentThree = {
        ...publicMoment,
        momentId: 'followed-3',
        authorId: 'author-followed-3',
        eventId: 'event-followed-3',
        createdAt: new Date('2026-05-15T09:00:00.000Z'),
      };
      const discoveryMoment = {
        ...publicMoment,
        momentId: 'discovery-1',
        authorId: 'author-discovery',
        eventId: 'event-discovery',
        createdAt: new Date('2026-05-15T08:00:00.000Z'),
      };

      (EventMomentDAO.readFeedCandidates as jest.Mock).mockResolvedValue({
        items: [followedMomentOne, followedMomentTwo, followedMomentThree, discoveryMoment],
        hasMore: false,
      });
      (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue([
        {
          targetType: FollowTargetType.User,
          targetId: 'author-followed-1',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.User,
          targetId: 'author-followed-2',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.User,
          targetId: 'author-followed-3',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.Organization,
          targetId: 'org-public',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.EventSeries,
          targetId: 'event-followed-1',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.EventSeries,
          targetId: 'event-followed-2',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
        {
          targetType: FollowTargetType.EventSeries,
          targetId: 'event-followed-3',
          approvalStatus: FollowApprovalStatus.Accepted,
        },
      ]);
      (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([
        followedAuthorOne,
        followedAuthorTwo,
        followedAuthorThree,
        discoveryAuthor,
      ]);
      (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([
        followedEventOne,
        followedEventTwo,
        followedEventThree,
        discoveryEvent,
      ]);

      const result = await EventMomentService.readMomentsFeed('viewer-1', undefined, 10);

      expect(result.items.map((item) => item.momentId)).toEqual([
        'followed-1',
        'followed-2',
        'discovery-1',
        'followed-3',
      ]);
    });

    it('uses an opaque cursor to continue within a ranked candidate window before advancing the DAO cursor', async () => {
      const firstWindowMomentOne = {
        ...publicMoment,
        momentId: 'window-1-a',
        createdAt: new Date('2026-05-15T09:00:00.000Z'),
      };
      const firstWindowMomentTwo = {
        ...publicMoment,
        momentId: 'window-1-b',
        createdAt: new Date('2026-05-15T08:00:00.000Z'),
      };
      const firstWindowMomentThree = {
        ...publicMoment,
        momentId: 'window-1-c',
        createdAt: new Date('2026-05-15T07:00:00.000Z'),
      };
      const secondWindowMoment = {
        ...publicMoment,
        momentId: 'window-2-a',
        createdAt: new Date('2026-05-15T06:00:00.000Z'),
      };

      (EventMomentDAO.readFeedCandidates as jest.Mock)
        .mockResolvedValueOnce({
          items: [firstWindowMomentOne, firstWindowMomentTwo, firstWindowMomentThree],
          hasMore: true,
          nextCursor: 'candidate-page-2',
        })
        .mockResolvedValueOnce({
          items: [firstWindowMomentOne, firstWindowMomentTwo, firstWindowMomentThree],
          hasMore: true,
          nextCursor: 'candidate-page-2',
        })
        .mockResolvedValueOnce({
          items: [secondWindowMoment],
          hasMore: false,
        });
      (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([publicAuthor]);
      (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([publicEvent]);

      const firstPage = await EventMomentService.readMomentsFeed(undefined, undefined, 2);
      const secondPage = await EventMomentService.readMomentsFeed(undefined, firstPage.nextCursor, 2);
      const thirdPage = await EventMomentService.readMomentsFeed(undefined, secondPage.nextCursor, 2);

      expect(firstPage.items.map((item) => item.momentId)).toEqual(['window-1-a', 'window-1-b']);
      expect(secondPage.items.map((item) => item.momentId)).toEqual(['window-1-c']);
      expect(thirdPage.items.map((item) => item.momentId)).toEqual(['window-2-a']);
      expect(EventMomentDAO.readFeedCandidates).toHaveBeenNthCalledWith(1, undefined, 48);
      expect(EventMomentDAO.readFeedCandidates).toHaveBeenNthCalledWith(2, undefined, 48);
      expect(EventMomentDAO.readFeedCandidates).toHaveBeenNthCalledWith(3, 'candidate-page-2', 48);
    });
  });
});
