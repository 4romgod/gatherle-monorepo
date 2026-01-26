import { graphql } from '@/data/graphql/types';

export const GetAdminDashboardStatsDocument = graphql(`
  query GetAdminDashboardStats {
    readAdminDashboardStats {
      totalEvents
      draftEvents
      publishedEvents
      upcomingEvents
      cancelledEvents
      totalCategories
      totalCategoryGroups
      totalUsers
      adminUsers
      hostUsers
    }
  }
`);
