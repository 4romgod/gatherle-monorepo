import type { CreateEventCategoryInput, EventCategory } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';
import { EventCategoryDAO } from '@/mongodb/dao';
import AuditLogService from './auditLog';

class EventCategoryService {
  static async create(
    input: CreateEventCategoryInput,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventCategory> {
    const created = await EventCategoryDAO.create(input);
    if (actorId && actorRole) {
      AuditLogService.logCategoryCreated({
        actorId,
        actorRole,
        categoryId: created.eventCategoryId,
        categoryName: created.name,
        ipAddress,
      });
    }
    return created;
  }

  static async deleteById(
    eventCategoryId: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventCategory> {
    const deleted = await EventCategoryDAO.deleteEventCategoryById(eventCategoryId);
    if (actorId && actorRole) {
      AuditLogService.logCategoryDeleted({
        actorId,
        actorRole,
        categoryId: deleted.eventCategoryId,
        categoryName: deleted.name,
        ipAddress,
      });
    }
    return deleted;
  }

  static async deleteBySlug(
    slug: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventCategory> {
    const deleted = await EventCategoryDAO.deleteEventCategoryBySlug(slug);
    if (actorId && actorRole) {
      AuditLogService.logCategoryDeleted({
        actorId,
        actorRole,
        categoryId: deleted.eventCategoryId,
        categoryName: deleted.name,
        ipAddress,
      });
    }
    return deleted;
  }
}

export default EventCategoryService;
