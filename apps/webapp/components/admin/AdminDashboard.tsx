'use client';

import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContactSupportRoundedIcon from '@mui/icons-material/ContactSupportRounded';
import { ROUTES } from '@/lib/constants';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import AdminDevicesSection from '@/components/admin/AdminDevicesSection';
import AdminEventsSection from '@/components/admin/AdminEventsSection';
import AdminCategorySection from '@/components/admin/AdminCategorySection';
import AdminCategoryGroupSection from '@/components/admin/AdminCategoryGroupSection';
import AdminUsersSection from '@/components/admin/AdminUsersSection';
import AdminOrganizationsSection from '@/components/admin/AdminOrganizationsSection';
import AdminVenuesSection from '@/components/admin/AdminVenuesSection';
import AdminSupportRequestsSection from '@/components/admin/AdminSupportRequestsSection';
import SessionStateManager from '@/components/admin/SessionStateManager';
import { AdminDomainLinkList, type AdminDomainLink } from '@/components/admin/AdminDomainLinkList';

type AdminDashboardProps = {
  token?: string | null;
  currentUserId?: string | null;
};

type AdminTab = {
  id: string;
  name: string;
  description: string;
  icon: ReactElement;
  content: ReactNode;
};

const OVERVIEW_TAB_ID = 'overview';

function normalizeAdminTab(rawValue: string | null | undefined, tabs: AdminTab[]): string {
  if (typeof rawValue === 'string') {
    const matched = tabs.find((tab) => tab.id === rawValue);
    if (matched) {
      return matched.id;
    }
  }
  return OVERVIEW_TAB_ID;
}

export default function AdminDashboard({ token, currentUserId }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? null;

  const tabs: AdminTab[] = useMemo(
    () => [
      {
        id: OVERVIEW_TAB_ID,
        name: 'Overview',
        description: 'Platform totals and event mix.',
        icon: <DashboardRoundedIcon fontSize="small" />,
        content: <AdminStatsPanel token={token} />,
      },
      {
        id: 'devices',
        name: 'Devices',
        description: 'Inspect native app installs and block them when needed.',
        icon: <SmartphoneRoundedIcon fontSize="small" />,
        content: <AdminDevicesSection token={token} />,
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Review and moderate event records.',
        icon: <EventRoundedIcon fontSize="small" />,
        content: <AdminEventsSection token={token} />,
      },
      {
        id: 'organizations',
        name: 'Organizations',
        description: 'Repair org metadata and memberships.',
        icon: <ApartmentRoundedIcon fontSize="small" />,
        content: <AdminOrganizationsSection token={token} currentUserId={currentUserId} />,
      },
      {
        id: 'venues',
        name: 'Venues',
        description: 'Maintain location and ownership records.',
        icon: <PlaceRoundedIcon fontSize="small" />,
        content: <AdminVenuesSection token={token} />,
      },
      {
        id: 'users',
        name: 'Users',
        description: 'Manage roles and account access.',
        icon: <PeopleAltRoundedIcon fontSize="small" />,
        content: <AdminUsersSection token={token} currentUserId={currentUserId} />,
      },
      {
        id: 'support',
        name: 'Support',
        description: 'Review feedback, bug reports, and help requests.',
        icon: <ContactSupportRoundedIcon fontSize="small" />,
        content: <AdminSupportRequestsSection token={token} />,
      },
      {
        id: 'categories',
        name: 'Categories',
        description: 'Maintain event category metadata.',
        icon: <CategoryRoundedIcon fontSize="small" />,
        content: <AdminCategorySection token={token} />,
      },
      {
        id: 'groups',
        name: 'Groups',
        description: 'Curate category groupings.',
        icon: <LayersRoundedIcon fontSize="small" />,
        content: <AdminCategoryGroupSection token={token} />,
      },
      {
        id: 'session-state',
        name: 'Session state',
        description: 'Inspect and clear stored session state entries.',
        icon: <StorageRoundedIcon fontSize="small" />,
        content: <SessionStateManager token={token ?? undefined} userId={currentUserId ?? undefined} />,
      },
    ],
    [token, currentUserId],
  );

  const activeTabId = normalizeAdminTab(requestedTab, tabs);
  const currentTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const isHubMobile = activeTabId === OVERVIEW_TAB_ID;

  const navigateToTab = (tabId: string) => {
    const href = tabId === OVERVIEW_TAB_ID ? ROUTES.ADMIN.ROOT : ROUTES.ADMIN.TAB(tabId);
    router.push(href, { scroll: false });
  };

  const domainLinks: AdminDomainLink[] = useMemo(
    () =>
      tabs
        .filter((tab) => tab.id !== OVERVIEW_TAB_ID)
        .map((tab) => ({
          id: tab.id,
          title: tab.name,
          description: tab.description,
          href: ROUTES.ADMIN.TAB(tab.id),
          icon: tab.icon,
        })),
    [tabs],
  );

  const renderDesktopTabs = () => (
    <Tabs
      orientation="vertical"
      value={activeTabId}
      onChange={(_event, nextValue: string) => navigateToTab(nextValue)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      aria-label="Admin console sections"
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        minHeight: 'unset',
        '& .MuiTabs-flexContainer': {
          alignItems: 'stretch',
          gap: 0.25,
        },
        '& .MuiTabs-scroller': {
          maxWidth: '100%',
          overflowX: 'hidden !important',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        },
        '& .MuiTabs-indicator': {
          display: 'none',
        },
        '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.25 },
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={`desktop-${tab.id}`}
          value={tab.id}
          disableRipple
          icon={tab.icon}
          iconPosition="start"
          label={
            <Stack spacing={0.1} alignItems="flex-start">
              <Typography
                component="span"
                sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2, textTransform: 'none' }}
              >
                {tab.name}
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.35,
                  textTransform: 'none',
                  whiteSpace: 'normal',
                  textAlign: 'left',
                  fontWeight: 400,
                }}
              >
                {tab.description}
              </Typography>
            </Stack>
          }
          sx={{
            minHeight: 60,
            alignItems: 'center',
            justifyContent: 'flex-start',
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            color: 'text.secondary',
            textTransform: 'none',
            bgcolor: 'transparent',
            maxWidth: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '& .MuiTab-icon': {
              mr: '8px !important',
              mb: '0 !important',
              fontSize: 18,
            },
            '&.Mui-selected': {
              color: (theme) =>
                theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.06),
            },
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.04),
            },
          }}
        />
      ))}
    </Tabs>
  );

  const headerTitle = isHubMobile ? 'Admin console' : currentTab.name;
  const headerDescription = isHubMobile
    ? 'Choose a domain to manage, or review the platform snapshot below.'
    : currentTab.description;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 }, maxWidth: '100%', overflowX: 'clip' }}>
      <Stack spacing={{ xs: 2.5, md: 3.5 }}>
        {/* Mobile-only "back to admin" link when viewing a single section. */}
        {!isHubMobile ? (
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Button
              component="a"
              href={ROUTES.ADMIN.ROOT}
              startIcon={<ArrowBackRoundedIcon />}
              size="small"
              variant="text"
              onClick={(event) => {
                event.preventDefault();
                router.push(ROUTES.ADMIN.ROOT, { scroll: false });
              }}
              sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
            >
              Admin console
            </Button>
          </Box>
        ) : null}

        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Stack spacing={0.25}>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.15 }}>
              {headerTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {headerDescription}
            </Typography>
          </Stack>
        </Stack>

        {/* Mobile hub: stats overview + domain link list, no tab strip. */}
        <Box sx={{ display: { xs: isHubMobile ? 'block' : 'none', md: 'none' } }}>
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            <AdminStatsPanel token={token} />
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
                Manage domains
              </Typography>
              <AdminDomainLinkList links={domainLinks} />
            </Stack>
          </Stack>
        </Box>

        {/* Mobile single-section view. */}
        <Box sx={{ display: { xs: !isHubMobile ? 'block' : 'none', md: 'none' } }}>{currentTab.content}</Box>

        {/* Desktop: side rail + content. */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '260px minmax(0, 1fr)',
            gap: 3,
            alignItems: 'start',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <Box sx={{ position: 'sticky', top: 88, minWidth: 0 }}>
            <Box
              sx={{
                maxWidth: '100%',
                overflow: 'hidden',
                borderRight: '1px solid',
                borderColor: 'divider',
                pr: 1,
              }}
            >
              {renderDesktopTabs()}
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }} key={currentTab.id}>
            {currentTab.content}
          </Box>
        </Box>
      </Stack>
    </Container>
  );
}
