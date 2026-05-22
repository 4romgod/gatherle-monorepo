'use client';

import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { EventCategory, Organization } from '@/data/graphql/types/graphql';
import OrganizationCard from '@/components/organization/organizationBox';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import Surface from '../core/Surface';

/**
 * Platform-wide statistics displayed in the sidebar
 */
export type PlatformStats = {
  totalEvents: number;
  activeOrganizations: number;
};

export type EventsSidebarProps = {
  popularOrganization: Organization | null;
  stats: PlatformStats;
  trendingCategories: EventCategory[];
};

export default function EventsSidebar({ popularOrganization, stats, trendingCategories }: EventsSidebarProps) {
  return (
    <Stack spacing={3}>
      {/* Popular Organization Box */}
      {popularOrganization && <OrganizationCard organization={popularOrganization} />}
    </Stack>
  );
}
