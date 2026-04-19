'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNavigation, BottomNavigationAction, Badge, Box, Paper, Avatar } from '@mui/material';
import {
  HomeOutlined,
  Home,
  EventOutlined,
  Event,
  NotificationsOutlined,
  Notifications,
  MailOutline,
  Mail,
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
  if (pathname.startsWith('/auth')) return 'login';
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
          sx={{
            height: MOBILE_BOTTOM_NAV_HEIGHT,
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              color: 'text.secondary',
              padding: '6px 0',
              '&.Mui-selected': { color: 'primary.main' },
            },
            '& .MuiBottomNavigationAction-label': { display: 'none' },
            '& .MuiSvgIcon-root': { fontSize: '1.75rem' },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={currentValue === 'home' ? <Home /> : <HomeOutlined />}
            component={Link}
            href={ROUTES.ROOT}
          />
          <BottomNavigationAction
            label="Events"
            value="events"
            icon={currentValue === 'events' ? <Event /> : <EventOutlined />}
            component={Link}
            href={ROUTES.EVENTS.ROOT}
          />
          <BottomNavigationAction
            label="Log in"
            value="login"
            icon={<LoginOutlined />}
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
        sx={{
          height: MOBILE_BOTTOM_NAV_HEIGHT,
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            color: 'text.secondary',
            padding: '6px 0',
            '&.Mui-selected': { color: 'primary.main' },
          },
          '& .MuiBottomNavigationAction-label': { display: 'none' },
          '& .MuiSvgIcon-root': { fontSize: '1.75rem' },
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={currentValue === 'home' ? <Home /> : <HomeOutlined />}
          component={Link}
          href={ROUTES.ROOT}
        />
        <BottomNavigationAction
          label="Events"
          value="events"
          icon={currentValue === 'events' ? <Event /> : <EventOutlined />}
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
              {currentValue === 'notifications' ? <Notifications /> : <NotificationsOutlined />}
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
              {currentValue === 'messages' ? <Mail /> : <MailOutline />}
            </Badge>
          }
          component={Link}
          href={ROUTES.ACCOUNT.MESSAGES}
        />
        <BottomNavigationAction
          label="Profile"
          value="profile"
          icon={
            <Avatar
              src={session?.user.profile_picture ?? undefined}
              sx={{
                width: 28,
                height: 28,
                fontSize: '0.8rem',
                border: currentValue === 'profile' ? '2px solid' : '2px solid transparent',
                borderColor: currentValue === 'profile' ? 'primary.main' : 'transparent',
                bgcolor: 'text.disabled',
              }}
            >
              {session?.user.given_name?.[0] ?? session?.user.name?.[0]}
            </Avatar>
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
