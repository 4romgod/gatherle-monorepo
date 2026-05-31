'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { alpha } from '@mui/material/styles';
import { Box, Chip, Grid, Skeleton, Stack, Typography } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { getAuthHeader } from '@/lib/utils/auth';
import { GetAdminDashboardStatsDocument } from '@/data/graphql/query/Admin/query';
import { ADMIN_SURFACE_SX, AdminMetricCard, AdminSectionHeader } from '@/components/admin/admin-ui';

type AdminStatsPanelProps = {
  token?: string | null;
};

const SUMMARY_METRICS = [
  { key: 'totalCategories', label: 'Categories', helper: 'Taxonomy driving event discovery' },
  { key: 'totalCategoryGroups', label: 'Groups', helper: 'Curated buckets for explore surfaces' },
  { key: 'totalUsers', label: 'Users', helper: 'Registered community members' },
  { key: 'adminUsers', label: 'Admins', helper: 'Accounts with elevated access' },
  { key: 'hostUsers', label: 'Hosts', helper: 'Accounts that can publish events' },
] as const;

const STATUS_BADGES = [
  { key: 'publishedEvents', label: 'Published', color: 'success' as const },
  { key: 'draftEvents', label: 'Drafts', color: 'warning' as const },
  { key: 'upcomingEvents', label: 'Upcoming', color: 'info' as const },
  { key: 'cancelledEvents', label: 'Cancelled', color: 'error' as const },
] as const;

export default function AdminStatsPanel({ token }: AdminStatsPanelProps) {
  const { data, loading } = useQuery(GetAdminDashboardStatsDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.readAdminDashboardStats;

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Platform snapshot"
        description="A quick read on volume, moderation surface area, and the current event mix."
      />

      <Stack
        spacing={2.5}
        sx={{
          ...ADMIN_SURFACE_SX,
          p: { xs: 2.5, md: 3.5 },
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.04),
          borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={2.5}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrendingUpRoundedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Stack spacing={0.5}>
              <Typography
                variant="overline"
                sx={{
                  color: (theme) =>
                    theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  lineHeight: 1,
                }}
              >
                Total events
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={140} height={48} />
              ) : (
                <Typography
                  variant="h2"
                  fontWeight={800}
                  sx={{ lineHeight: 1.05, fontSize: { xs: '2rem', md: '2.5rem' } }}
                >
                  {stats?.totalEvents?.toLocaleString() ?? '0'}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {loading
                  ? 'Loading platform summary…'
                  : `Spread across ${stats?.totalCategories ?? 0} categories and ${stats?.totalUsers ?? 0} registered members.`}
              </Typography>
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            useFlexGap
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          >
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
      </Stack>

      <Grid container spacing={2}>
        {SUMMARY_METRICS.map((metric, index) => (
          <Grid size={{ xs: 6, sm: 6, lg: 4, xl: 3 }} key={metric.key}>
            {loading ? (
              <Stack spacing={1} sx={{ ...ADMIN_SURFACE_SX, p: { xs: 2.25, md: 2.75 } }}>
                <Skeleton width={100} />
                <Skeleton width={60} height={32} />
                <Skeleton width="100%" />
              </Stack>
            ) : (
              <AdminMetricCard
                label={metric.label}
                value={(stats?.[metric.key as keyof typeof stats] ?? 0).toLocaleString()}
                helper={metric.helper}
                tone={index === 0 ? 'accent' : 'default'}
              />
            )}
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
