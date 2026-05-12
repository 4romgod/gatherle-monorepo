'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomNavigation, BottomNavigationAction, Badge, Box, Paper, Avatar } from '@mui/material';
import { useSession } from 'next-auth/react';
import { FiBell, FiCalendar, FiHome, FiMessageCircle, FiUser } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { ROUTES, isIndividualChatRoute } from '@/lib/constants';
import { useUnreadChatCount, useUnreadNotificationCount } from '@/hooks';

/** Height of the bottom nav bar (used as padding offset in layout). */
export const MOBILE_BOTTOM_NAV_HEIGHT = 60;
const MOBILE_BOTTOM_NAV_ICON_SIZE = 24;

function resolveNavValue(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/account/notifications')) return 'notifications';
  if (pathname.startsWith('/account/messages')) return 'messages';
  if (pathname.startsWith('/account')) return 'profile';
  if (pathname.startsWith('/users/')) return 'profile';
  return '';
}

function FeatherNavIcon({ icon: Icon }: { icon: IconType }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}
    >
      <Icon size={MOBILE_BOTTOM_NAV_ICON_SIZE} />
    </Box>
  );
}

interface MobileNavItem {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
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
  const guestProtectedHref = ROUTES.AUTH.LOGIN;
  const profileHref = session?.user?.username ? ROUTES.USERS.USER(session.user.username) : ROUTES.ACCOUNT.ROOT;

  const navItems: MobileNavItem[] = [
    {
      label: 'Home',
      value: 'home',
      href: ROUTES.ROOT,
      icon: <FeatherNavIcon icon={FiHome} />,
    },
    {
      label: 'Events',
      value: 'events',
      href: ROUTES.EVENTS.ROOT,
      icon: <FeatherNavIcon icon={FiCalendar} />,
    },
    {
      label: 'Messages',
      value: 'messages',
      href: isAuthN ? ROUTES.ACCOUNT.MESSAGES : guestProtectedHref,
      icon: isAuthN ? (
        <Badge
          badgeContent={unreadMessages}
          color="error"
          max={99}
          sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}
        >
          <FeatherNavIcon icon={FiMessageCircle} />
        </Badge>
      ) : (
        <FeatherNavIcon icon={FiMessageCircle} />
      ),
    },
    {
      label: 'Notifications',
      value: 'notifications',
      href: isAuthN ? ROUTES.ACCOUNT.NOTIFICATIONS : guestProtectedHref,
      icon: isAuthN ? (
        <Badge
          badgeContent={unreadNotifications}
          color="error"
          max={99}
          sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}
        >
          <FeatherNavIcon icon={FiBell} />
        </Badge>
      ) : (
        <FeatherNavIcon icon={FiBell} />
      ),
    },
    {
      label: 'Profile',
      value: 'profile',
      href: isAuthN ? profileHref : guestProtectedHref,
      icon: isAuthN ? (
        <Avatar
          src={session?.user.profile_picture ?? undefined}
          sx={{
            width: 28,
            height: 28,
            fontSize: '0.8rem',
            border: '2px solid',
            borderColor: currentValue === 'profile' ? 'primary.main' : 'transparent',
            bgcolor: 'text.disabled',
          }}
        >
          {session?.user.given_name?.[0] ?? session?.user.name?.[0]}
        </Avatar>
      ) : (
        <FeatherNavIcon icon={FiUser} />
      ),
    },
  ];

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
        bgcolor: 'background.default',
      }}
    >
      <BottomNavigation
        value={currentValue}
        sx={{
          height: MOBILE_BOTTOM_NAV_HEIGHT,
          bgcolor: 'background.default',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            color: 'text.secondary',
            padding: '6px 0',
            '&.Mui-selected': { color: 'primary.main' },
          },
          '& .MuiBottomNavigationAction-label': { display: 'none' },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            aria-label={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            component={Link}
            href={item.href}
          />
        ))}
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
