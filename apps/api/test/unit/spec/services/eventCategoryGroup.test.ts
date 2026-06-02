jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
}));

jest.mock('@/mongodb/dao', () => ({
  EventCategoryGroupDAO: {
    create: jest.fn(),
    deleteEventCategoryGroupBySlug: jest.fn(),
  },
}));

jest.mock('@/services/auditLog', () => ({
  __esModule: true,
  default: {
    logCategoryGroupCreated: jest.fn(),
    logCategoryGroupDeleted: jest.fn(),
  },
}));

import EventCategoryGroupService from '@/services/eventCategoryGroup';
import { EventCategoryGroupDAO } from '@/mongodb/dao';
import AuditLogService from '@/services/auditLog';
import type { CreateEventCategoryGroupInput, EventCategoryGroup } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';

describe('EventCategoryGroupService', () => {
  const mockGroup: EventCategoryGroup = {
    eventCategoryGroupId: 'group-1',
    name: 'Arts',
    slug: 'arts',
  };

  const createInput: CreateEventCategoryGroupInput = { name: 'Arts', slug: 'arts' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates the group via the DAO and returns it', async () => {
      (EventCategoryGroupDAO.create as jest.Mock).mockResolvedValue(mockGroup);

      const result = await EventCategoryGroupService.create(createInput);

      expect(EventCategoryGroupDAO.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(mockGroup);
    });

    it('fires audit log when actor params are provided', async () => {
      (EventCategoryGroupDAO.create as jest.Mock).mockResolvedValue(mockGroup);

      await EventCategoryGroupService.create(createInput, 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logCategoryGroupCreated).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        categoryGroupId: mockGroup.eventCategoryGroupId,
        categoryGroupName: mockGroup.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (EventCategoryGroupDAO.create as jest.Mock).mockResolvedValue(mockGroup);

      await EventCategoryGroupService.create(createInput);

      expect(AuditLogService.logCategoryGroupCreated).not.toHaveBeenCalled();
    });

    it('does not fire audit log when actorId is provided but actorRole is missing', async () => {
      (EventCategoryGroupDAO.create as jest.Mock).mockResolvedValue(mockGroup);

      await EventCategoryGroupService.create(createInput, 'actor-1');

      expect(AuditLogService.logCategoryGroupCreated).not.toHaveBeenCalled();
    });
  });

  describe('deleteBySlug', () => {
    it('deletes the group by slug via the DAO and returns it', async () => {
      (EventCategoryGroupDAO.deleteEventCategoryGroupBySlug as jest.Mock).mockResolvedValue(mockGroup);

      const result = await EventCategoryGroupService.deleteBySlug('arts');

      expect(EventCategoryGroupDAO.deleteEventCategoryGroupBySlug).toHaveBeenCalledWith('arts');
      expect(result).toEqual(mockGroup);
    });

    it('fires audit log when actor params are provided', async () => {
      (EventCategoryGroupDAO.deleteEventCategoryGroupBySlug as jest.Mock).mockResolvedValue(mockGroup);

      await EventCategoryGroupService.deleteBySlug('arts', 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logCategoryGroupDeleted).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        categoryGroupId: mockGroup.eventCategoryGroupId,
        categoryGroupName: mockGroup.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (EventCategoryGroupDAO.deleteEventCategoryGroupBySlug as jest.Mock).mockResolvedValue(mockGroup);

      await EventCategoryGroupService.deleteBySlug('arts');

      expect(AuditLogService.logCategoryGroupDeleted).not.toHaveBeenCalled();
    });
  });
});
