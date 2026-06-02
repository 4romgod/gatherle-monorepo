import 'reflect-metadata';
import { EventSeriesResolver } from '@/graphql/resolvers/eventSeries';
import { EventSeriesDAO } from '@/mongodb/dao';
import type { EventSeries } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';
import * as validation from '@/validation';
import type { ServerContext } from '@/graphql';
import EventSeriesService from '@/services/eventSeries';

jest.mock('@/services/eventSeries', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    deleteBySlug: jest.fn(),
    splitAtOccurrence: jest.fn(),
    readTrending: jest.fn(),
  },
}));

jest.mock('@/services/recommendation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/services/eventOccurrence', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    readEventById: jest.fn(),
    readEventBySlug: jest.fn(),
  },
  OrganizationMembershipDAO: {
    readMembershipsByOrgId: jest.fn(),
  },
}));

jest.mock('@/validation', () => ({
  validateInput: jest.fn(),
  validateMongodbId: jest.fn(),
  CreateEventInputSchema: {},
  UpdateEventInputSchema: {},
  CancelEventOccurrenceInputSchema: {},
  SplitEventSeriesInputSchema: {},
  UpdateEventOccurrenceInputSchema: {},
  ERROR_MESSAGES: {
    ATLEAST_ONE: (type: string) => `At least one ${type} is required`,
    INVALID: 'is invalid',
    REQUIRED: 'is required',
    NOT_FOUND: (type: string, field: string, value: string) => `${type} with ${field} ${value} does not exist`,
    DOES_NOT_EXIST: (type: string, field: string, value: string) => `${type} with ${field} ${value} does not exist`,
  },
}));

jest.mock('@/validation/zod', () => ({
  CancelEventOccurrenceInputSchema: {},
  CreateEventInputSchema: {},
  SplitEventSeriesInputSchema: {},
  UpdateEventInputSchema: {},
  UpdateEventOccurrenceInputSchema: {},
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

describe('EventSeriesResolver delete mutations', () => {
  let resolver: EventSeriesResolver;

  const mockEvent: EventSeries = {
    eventId: 'event-001',
    slug: 'test-event',
    title: 'Test Event',
    description: 'Test event description',
    status: 'Upcoming' as any,
    eventCategories: [],
    organizers: [],
    primarySchedule: {
      anchorStartAt: new Date(),
      occurrenceDurationMinutes: 60,
      timezone: 'UTC',
      recurrenceRule: 'FREQ=DAILY;COUNT=1',
    },
    location: { type: 'Online', coordinates: [0, 0] } as any,
  } as EventSeries;

  const mockContext = {
    user: { userId: 'user-001', userRole: UserRole.Admin },
  } as unknown as ServerContext;

  beforeEach(() => {
    resolver = new EventSeriesResolver();
    jest.clearAllMocks();
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => undefined);
  });

  describe('deleteEventById', () => {
    it('reads the event, checks authorization, and calls EventSeriesService.deleteById', async () => {
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
      (EventSeriesService.deleteById as jest.Mock).mockResolvedValue(mockEvent);

      const result = await resolver.deleteEventById('event-001', mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith('event-001', expect.any(String));
      expect(EventSeriesDAO.readEventById).toHaveBeenCalledWith('event-001');
      expect(EventSeriesService.deleteById).toHaveBeenCalledWith('event-001', 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('deleteEventBySlug', () => {
    it('reads the event by slug and calls EventSeriesService.deleteBySlug', async () => {
      (EventSeriesDAO.readEventBySlug as jest.Mock).mockResolvedValue(mockEvent);
      (EventSeriesService.deleteBySlug as jest.Mock).mockResolvedValue(mockEvent);

      const result = await resolver.deleteEventBySlug('test-event', mockContext);

      expect(EventSeriesDAO.readEventBySlug).toHaveBeenCalledWith('test-event');
      expect(EventSeriesService.deleteBySlug).toHaveBeenCalledWith('test-event', 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockEvent);
    });
  });
});
