import 'reflect-metadata';
import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import {
  AdminDashboardStats,
  AuditLogPage,
  EventLifecycleStatus,
  EventStatus,
  ReadAuditLogsInput,
  UserRole,
} from '@gatherle/commons/types';
import { EventCategoryDAO, EventCategoryGroupDAO, EventSeriesDAO, UserDAO } from '@/mongodb/dao';
import { AuditLogService } from '@/services';
import { RESOLVER_DESCRIPTIONS } from '@/constants';

@Resolver()
export class AdminResolver {
  @Authorized([UserRole.Admin])
  @Query(() => AdminDashboardStats, {
    description: RESOLVER_DESCRIPTIONS.ADMIN.readAdminDashboardStats,
  })
  async readAdminDashboardStats(): Promise<AdminDashboardStats> {
    const [
      totalEvents,
      draftEvents,
      publishedEvents,
      upcomingEvents,
      cancelledEvents,
      totalCategories,
      totalCategoryGroups,
      totalUsers,
      adminUsers,
      hostUsers,
    ] = await Promise.all([
      EventSeriesDAO.count(),
      EventSeriesDAO.count({ lifecycleStatus: EventLifecycleStatus.Draft }),
      EventSeriesDAO.count({ lifecycleStatus: EventLifecycleStatus.Published }),
      EventSeriesDAO.count({ status: EventStatus.Upcoming }),
      EventSeriesDAO.count({ status: EventStatus.Cancelled }),
      EventCategoryDAO.count(),
      EventCategoryGroupDAO.count(),
      UserDAO.count(),
      UserDAO.count({ userRole: UserRole.Admin }),
      UserDAO.count({ userRole: UserRole.Host }),
    ]);

    return {
      totalEvents,
      draftEvents,
      publishedEvents,
      upcomingEvents,
      cancelledEvents,
      totalCategories,
      totalCategoryGroups,
      totalUsers,
      adminUsers,
      hostUsers,
    };
  }

  @Authorized([UserRole.Admin])
  @Query(() => AuditLogPage, {
    description: RESOLVER_DESCRIPTIONS.ADMIN.readAuditLogs,
  })
  async readAuditLogs(
    @Arg('input', () => ReadAuditLogsInput, { nullable: true }) input?: ReadAuditLogsInput,
  ): Promise<AuditLogPage> {
    return AuditLogService.readPage(input ?? {});
  }
}
