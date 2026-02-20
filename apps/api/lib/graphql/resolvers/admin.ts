import 'reflect-metadata';
import { Authorized, Query, Resolver } from 'type-graphql';
import { AdminDashboardStats, EventLifecycleStatus, EventStatus, UserRole } from '@gatherle/commons/types';
import { EventCategoryDAO, EventCategoryGroupDAO, EventDAO, UserDAO } from '@/mongodb/dao';
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
      EventDAO.count(),
      EventDAO.count({ lifecycleStatus: EventLifecycleStatus.Draft }),
      EventDAO.count({ lifecycleStatus: EventLifecycleStatus.Published }),
      EventDAO.count({ status: EventStatus.Upcoming }),
      EventDAO.count({ status: EventStatus.Cancelled }),
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
}
