import { AuditLog as AuditLogModel } from '@/mongodb/models';
import type { AuditLog, AuditLogPage, ReadAuditLogsInput, WriteAuditLogInput } from '@gatherle/commons/types';
import { logDaoError, KnownCommonError } from '@/utils';

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

class AuditLogDAO {
  static async write(input: WriteAuditLogInput): Promise<void> {
    try {
      await AuditLogModel.create(input);
    } catch (error) {
      logDaoError('[AuditLogDAO] Error writing audit log entry', { error, action: input.action });
      throw KnownCommonError(error);
    }
  }

  static async readPage(filters: ReadAuditLogsInput): Promise<AuditLogPage> {
    const limit = Math.min(filters.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);

    const query: Record<string, unknown> = {};

    if (filters.actorId) {
      query['actorId'] = filters.actorId;
    }
    if (filters.targetType) {
      query['targetType'] = filters.targetType;
    }
    if (filters.targetId) {
      query['targetId'] = filters.targetId;
    }
    if (filters.action) {
      query['action'] = filters.action;
    }

    const dateFilter: Record<string, Date> = {};
    if (filters.fromDate) {
      dateFilter['$gte'] = filters.fromDate;
    }
    if (filters.cursor) {
      // Cursor is the createdAt of the last item; fetch entries older than it
      dateFilter['$lt'] = new Date(filters.cursor);
    } else if (filters.toDate) {
      dateFilter['$lt'] = filters.toDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      query['createdAt'] = dateFilter;
    }

    try {
      // Fetch one extra to detect if there are more pages
      const docs = await AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean()
        .exec();

      const hasMore = docs.length > limit;
      const items = (hasMore ? docs.slice(0, limit) : docs) as AuditLog[];
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

      return { items, hasMore, nextCursor };
    } catch (error) {
      logDaoError('[AuditLogDAO] Error reading audit log page', { error });
      throw KnownCommonError(error);
    }
  }
}

export default AuditLogDAO;
