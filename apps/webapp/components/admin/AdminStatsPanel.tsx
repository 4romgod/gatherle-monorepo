'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { Grid, Card, CardContent, Stack, Typography, Skeleton, Chip } from '@mui/material';
import { getAuthHeader } from '@/lib/utils/auth';
import { GetAdminDashboardStatsDocument } from '@/data/graphql/query/Admin/query';

type AdminStatsPanelProps = {
  token?: string | null;
};

const SUMMARY_METRICS = [
  { key: 'totalCategories', label: 'Categories' },
  { key: 'totalCategoryGroups', label: 'Category groups' },
  { key: 'totalUsers', label: 'Community' },
  { key: 'adminUsers', label: 'Admins' },
  { key: 'hostUsers', label: 'Hosts' },
];

const STATUS_BADGES = [
  { key: 'publishedEvents', label: 'Published', color: 'success' as const },
  { key: 'draftEvents', label: 'Drafts', color: 'warning' as const },
  { key: 'upcomingEvents', label: 'Upcoming', color: 'info' as const },
  { key: 'cancelledEvents', label: 'Cancelled', color: 'error' as const },
];

export default function AdminStatsPanel({ token }: AdminStatsPanelProps) {
  const { data, loading } = useQuery(GetAdminDashboardStatsDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.readAdminDashboardStats;

  return (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
              Overview
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={160} height={48} />
            ) : (
              <Typography variant="h2" fontWeight={700}>
                {stats?.totalEvents?.toLocaleString() ?? '0'}
              </Typography>
            )}
            <Typography color="text.secondary">
              {loading
                ? 'Loading summary...'
                : `Across ${stats?.totalCategories ?? 0} categories and ${stats?.totalUsers ?? 0} active members`}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {STATUS_BADGES.map((badge) => (
                <Chip
                  key={badge.key}
                  label={`${badge.label}: ${stats?.[badge.key as keyof typeof stats] ?? 0}`}
                  size="small"
                  color={badge.color}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {SUMMARY_METRICS.map((metric) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={metric.key}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
                  {metric.label}
                </Typography>
                {loading ? (
                  <Skeleton width={120} height={40} />
                ) : (
                  <Typography variant="h4" fontWeight={700}>
                    {(stats?.[metric.key as keyof typeof stats] ?? 0).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
