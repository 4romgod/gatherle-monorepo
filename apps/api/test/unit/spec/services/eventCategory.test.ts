jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
}));

jest.mock('@/mongodb/dao', () => ({
  EventCategoryDAO: {
    create: jest.fn(),
    deleteEventCategoryById: jest.fn(),
    deleteEventCategoryBySlug: jest.fn(),
  },
}));

jest.mock('@/services/auditLog', () => ({
  __esModule: true,
  default: {
    logCategoryCreated: jest.fn(),
    logCategoryDeleted: jest.fn(),
  },
}));

import EventCategoryService from '@/services/eventCategory';
import { EventCategoryDAO } from '@/mongodb/dao';
import AuditLogService from '@/services/auditLog';
import type { CreateEventCategoryInput, EventCategory } from '@gatherle/commons/server/types';
import { UserRole } from '@gatherle/commons/server/types';

describe('EventCategoryService', () => {
  const mockCategory: EventCategory = {
    eventCategoryId: 'cat-1',
    name: 'Music',
    slug: 'music',
    iconName: 'music-note',
    description: 'Music events',
  };

  const createInput: CreateEventCategoryInput = {
    name: 'Music',
    iconName: 'music-note',
    description: 'Music events',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates the category via the DAO and returns it', async () => {
      (EventCategoryDAO.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await EventCategoryService.create(createInput);

      expect(EventCategoryDAO.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(mockCategory);
    });

    it('fires audit log when actor params are provided', async () => {
      (EventCategoryDAO.create as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.create(createInput, 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logCategoryCreated).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        categoryId: mockCategory.eventCategoryId,
        categoryName: mockCategory.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (EventCategoryDAO.create as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.create(createInput);

      expect(AuditLogService.logCategoryCreated).not.toHaveBeenCalled();
    });

    it('does not fire audit log when actorId is provided but actorRole is missing', async () => {
      (EventCategoryDAO.create as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.create(createInput, 'actor-1');

      expect(AuditLogService.logCategoryCreated).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('deletes the category by ID via the DAO and returns it', async () => {
      (EventCategoryDAO.deleteEventCategoryById as jest.Mock).mockResolvedValue(mockCategory);

      const result = await EventCategoryService.deleteById('cat-1');

      expect(EventCategoryDAO.deleteEventCategoryById).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(mockCategory);
    });

    it('fires audit log when actor params are provided', async () => {
      (EventCategoryDAO.deleteEventCategoryById as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.deleteById('cat-1', 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logCategoryDeleted).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        categoryId: mockCategory.eventCategoryId,
        categoryName: mockCategory.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (EventCategoryDAO.deleteEventCategoryById as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.deleteById('cat-1');

      expect(AuditLogService.logCategoryDeleted).not.toHaveBeenCalled();
    });
  });

  describe('deleteBySlug', () => {
    it('deletes the category by slug via the DAO and returns it', async () => {
      (EventCategoryDAO.deleteEventCategoryBySlug as jest.Mock).mockResolvedValue(mockCategory);

      const result = await EventCategoryService.deleteBySlug('music');

      expect(EventCategoryDAO.deleteEventCategoryBySlug).toHaveBeenCalledWith('music');
      expect(result).toEqual(mockCategory);
    });

    it('fires audit log when actor params are provided', async () => {
      (EventCategoryDAO.deleteEventCategoryBySlug as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.deleteBySlug('music', 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logCategoryDeleted).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        categoryId: mockCategory.eventCategoryId,
        categoryName: mockCategory.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (EventCategoryDAO.deleteEventCategoryBySlug as jest.Mock).mockResolvedValue(mockCategory);

      await EventCategoryService.deleteBySlug('music');

      expect(AuditLogService.logCategoryDeleted).not.toHaveBeenCalled();
    });
  });
});
