import type { CreateEventCategoryGroupInput, EventCategoryGroup } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';
import { EventCategoryGroupDAO } from '@/mongodb/dao';
import AuditLogService from './auditLog';

class EventCategoryGroupService {
  static async create(
    input: CreateEventCategoryGroupInput,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventCategoryGroup> {
    const created = await EventCategoryGroupDAO.create(input);
    if (actorId && actorRole) {
      AuditLogService.logCategoryGroupCreated({
        actorId,
        actorRole,
        categoryGroupId: created.eventCategoryGroupId,
        categoryGroupName: created.name,
        ipAddress,
      });
    }
    return created;
  }

  static async deleteBySlug(
    slug: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventCategoryGroup> {
    const deleted = await EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug);
    if (actorId && actorRole) {
      AuditLogService.logCategoryGroupDeleted({
        actorId,
        actorRole,
        categoryGroupId: deleted.eventCategoryGroupId,
        categoryGroupName: deleted.name,
        ipAddress,
      });
    }
    return deleted;
  }
}

export default EventCategoryGroupService;
