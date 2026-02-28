'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNavigation, BottomNavigationAction, Badge, Box, Paper } from '@mui/material';
import {
  HomeOutlined,
  Home,
  EventOutlined,
  Event,
  NotificationsOutlined,
  Notifications,
  MailOutline,
  Mail,
  AccountCircleOutlined,
  AccountCircle,
  LoginOutlined,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { ROUTES, isIndividualChatRoute } from '@/lib/constants';
import { useUnreadChatCount, useUnreadNotificationCount } from '@/hooks';

/** Height of the bottom nav bar (used as padding offset in layout). */
export const MOBILE_BOTTOM_NAV_HEIGHT = 60;

function resolveNavValue(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/account/notifications')) return 'notifications';
  if (pathname.startsWith('/account/messages')) return 'messages';
  if (pathname.startsWith('/account')) return 'profile';
  return '';
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthN = Boolean(session?.user?.userId && session?.user?.token);
  const isLoading = status === 'loading';

  const { unreadCount: unreadNotifications } = useUnreadNotificationCount();
  const { unreadCount: unreadMessages } = useUnreadChatCount();

  if (isIndividualChatRoute(pathname) || isLoading) return null;

  const currentValue = resolveNavValue(pathname);

  if (!isAuthN) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: '1px solid',
          borderColor: 'divider',
          pb: 'env(safe-area-inset-bottom, 0px)',
          bgcolor: 'background.paper',
        }}
      >
        <BottomNavigation
          value={currentValue}
          showLabels
          sx={{
            height: MOBILE_BOTTOM_NAV_HEIGHT,
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontWeight: 600,
              '&.Mui-selected': { fontSize: '0.65rem' },
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={currentValue === 'home' ? <Home fontSize="small" /> : <HomeOutlined fontSize="small" />}
            component={Link}
            href={ROUTES.ROOT}
          />
          <BottomNavigationAction
            label="Events"
            value="events"
            icon={currentValue === 'events' ? <Event fontSize="small" /> : <EventOutlined fontSize="small" />}
            component={Link}
            href={ROUTES.EVENTS.ROOT}
          />
          <BottomNavigationAction
            label="Log in"
            value="login"
            icon={<LoginOutlined fontSize="small" />}
            component={Link}
            href={ROUTES.AUTH.LOGIN}
          />
        </BottomNavigation>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: '1px solid',
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
        bgcolor: 'background.paper',
      }}
    >
      <BottomNavigation
        value={currentValue}
        showLabels
        sx={{
          height: MOBILE_BOTTOM_NAV_HEIGHT,
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main' },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem',
            fontWeight: 600,
            '&.Mui-selected': { fontSize: '0.65rem' },
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={currentValue === 'home' ? <Home fontSize="small" /> : <HomeOutlined fontSize="small" />}
          component={Link}
          href={ROUTES.ROOT}
        />
        <BottomNavigationAction
          label="Events"
          value="events"
          icon={currentValue === 'events' ? <Event fontSize="small" /> : <EventOutlined fontSize="small" />}
          component={Link}
          href={ROUTES.EVENTS.ROOT}
        />
        <BottomNavigationAction
          label="Notifications"
          value="notifications"
          icon={
            <Badge
              badgeContent={unreadNotifications}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}
            >
              {currentValue === 'notifications' ? (
                <Notifications fontSize="small" />
              ) : (
                <NotificationsOutlined fontSize="small" />
              )}
            </Badge>
          }
          component={Link}
          href={ROUTES.ACCOUNT.NOTIFICATIONS}
        />
        <BottomNavigationAction
          label="Messages"
          value="messages"
          icon={
            <Badge
              badgeContent={unreadMessages}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}
            >
              {currentValue === 'messages' ? <Mail fontSize="small" /> : <MailOutline fontSize="small" />}
            </Badge>
          }
          component={Link}
          href={ROUTES.ACCOUNT.MESSAGES}
        />
        <BottomNavigationAction
          label="Profile"
          value="profile"
          icon={
            currentValue === 'profile' ? <AccountCircle fontSize="small" /> : <AccountCircleOutlined fontSize="small" />
          }
          component={Link}
          href={ROUTES.ACCOUNT.ROOT}
        />
      </BottomNavigation>
    </Paper>
  );
}

/**
 * Invisible spacer that prevents page content from being hidden behind
 * the fixed bottom nav on mobile devices.
 */
export function MobileBottomNavSpacer() {
  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        height: MOBILE_BOTTOM_NAV_HEIGHT,
        flexShrink: 0,
      }}
    />
  );
}
