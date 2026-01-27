'use client';

import Link from 'next/link';
import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import LayersIcon from '@mui/icons-material/Layers';
import PeopleIcon from '@mui/icons-material/People';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import AdminEventsSection from '@/components/admin/AdminEventsSection';
import AdminCategorySection from '@/components/admin/AdminCategorySection';
import AdminCategoryGroupSection from '@/components/admin/AdminCategoryGroupSection';
import AdminUsersSection from '@/components/admin/AdminUsersSection';
import CustomTabs, { CustomTabItem } from '@/components/core/tabs/CustomTabs';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.userRole === UserRole.Admin;
  const token = session?.user?.token;
  const currentUserId = session?.user?.userId;

  const tabs: CustomTabItem[] = React.useMemo(
    () => [
      {
        name: 'Overview',
        description: 'High level stats so you know what is happening at a glance.',
        icon: <EqualizerIcon fontSize="small" />,
        content: <AdminStatsPanel token={token} />,
      },
      {
        name: 'Events',
        description: 'Surface recent events and quickly update their status or lifecycle.',
        icon: <EventIcon fontSize="small" />,
        content: <AdminEventsSection token={token} />,
      },
      {
        name: 'Categories',
        description: 'Maintain the category list that powers the explorer.',
        icon: <CategoryIcon fontSize="small" />,
        content: <AdminCategorySection token={token} />,
      },
      {
        name: 'Groups',
        description: 'Group related categories for curated navigation.',
        icon: <LayersIcon fontSize="small" />,
        content: <AdminCategoryGroupSection token={token} />,
      },
      {
        name: 'Users',
        description: 'Promote/demote roles and delete problematic accounts.',
        icon: <PeopleIcon fontSize="small" />,
        content: <AdminUsersSection token={token} currentUserId={currentUserId} />,
      },
    ],
    [token, currentUserId],
  );

  if (!isAdmin) {
    return (
      <Container sx={{ py: { xs: 8, md: 10 } }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h4" fontWeight={800}>
            Access denied
          </Typography>
          <Typography color="text.secondary" textAlign="center" maxWidth={520}>
            You need to be an admin to view this section. If you believe this is a mistake reach out to another
            administrator or return to the home page.
          </Typography>
          <Button component={Link} href={ROUTES.HOME} variant="contained" color="secondary">
            Go back home
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={6}>
        <Stack spacing={1}>
          <Typography variant="overline" sx={{ letterSpacing: 4, color: 'primary.main', fontWeight: 700 }}>
            ADMIN CONSOLE
          </Typography>
          <Typography variant="h3" fontWeight={800}>
            Manage everything in one secure dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
            Review site-wide activity, curate event categories, and keep the community healthy from a single control
            panel. Changes apply immediately across the platform.
          </Typography>
        </Stack>
        <CustomTabs
          tabsProps={{
            tabsTitle: 'Admin control panels',
            tabs,
            defaultTab: 0,
            variant: 'scrollable',
            id: 'admin-console-tabs',
          }}
        />
      </Stack>
    </Container>
  );
}
