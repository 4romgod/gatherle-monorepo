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

      {/* Trending Categories Box */}
      <Surface
        disableShadow
        sx={{
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
          gridTemplateRows: { xs: 'auto auto', sm: '180px' },
          gap: 0,
          height: { xs: 'auto', sm: 180 },
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          borderColor: 'divider',
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <EventIcon color="primary" fontSize="small" />
            <Typography variant="overline" color="text.secondary" fontWeight={600}>
              Trending Categories
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {trendingCategories.map((category) => (
              <EventCategoryBadge key={category.eventCategoryId} category={category} />
            ))}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Discover events by exploring popular categories
          </Typography>
        </CardContent>
      </Surface>
    </Stack>
  );
}
