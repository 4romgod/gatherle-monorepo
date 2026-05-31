'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import {
  Add,
  ArrowBack,
  MailOutline,
  NotificationsOutlined,
  ControlPointOutlined,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ProfilesMenu from '@/components/navigation/main/NavigationProfileItems';
import { Button } from '@mui/material';
import { ROUTES, APP_NAME } from '@/lib/constants';
import NavLinksList from '@/components/navigation/main/NavLinksList';
import { getAvatarSrc } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useUnreadChatCount, useUnreadNotificationCount } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';
import Logo from '@/components/logo';
import { WEB_RADIUS } from '@/lib/constants/radius';

type MainNavigationProps = {
  isAuthN: boolean;
};

type SubPageAction = {
  href: string;
  label: string;
};

// Keep this aligned with the mobile bottom-nav destinations only.
const mainShellRoutes = new Set([
  ROUTES.ROOT,
  ROUTES.HOME,
  ROUTES.EVENTS.ROOT,
  ROUTES.MOMENTS.ROOT,
  ROUTES.ACCOUNT.ROOT,
  ROUTES.ACCOUNT.MESSAGES,
  ROUTES.ACCOUNT.NOTIFICATIONS,
]);

function normalizePathname(pathname: string | null): string {
  if (!pathname) return ROUTES.ROOT;
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function isOwnProfileRoute(pathname: string, username?: string | null) {
  return Boolean(username) && pathname === ROUTES.USERS.USER(username!);
}

function isMainShellRoute(pathname: string) {
  return mainShellRoutes.has(pathname);
}

function getBackFallback(pathname: string, username?: string | null) {
  if (isOwnProfileRoute(pathname, username)) return ROUTES.ACCOUNT.ROOT;
  if (pathname.startsWith('/account/messages/')) return ROUTES.ACCOUNT.MESSAGES;
  if (pathname === ROUTES.VENUES.ROOT) return ROUTES.ROOT;
  if (pathname === ROUTES.VENUES.ADD || pathname.startsWith('/venues/')) return ROUTES.VENUES.ROOT;
  if (pathname === ROUTES.ORGANIZATIONS.ROOT) return ROUTES.ROOT;
  if (pathname === ROUTES.ACCOUNT.ORGANIZATIONS.CREATE || pathname.startsWith('/organizations/')) {
    return ROUTES.ORGANIZATIONS.ROOT;
  }
  if (pathname.startsWith('/account/organizations/')) return ROUTES.ACCOUNT.ORGANIZATIONS.ROOT;
  if (pathname === ROUTES.ACCOUNT.EVENTS.CREATE || pathname.startsWith('/events/')) return ROUTES.EVENTS.ROOT;
  if (pathname === ROUTES.CATEGORIES.ROOT) return ROUTES.ROOT;
  if (pathname.startsWith('/categories/')) return ROUTES.CATEGORIES.ROOT;
  if (pathname === ROUTES.USERS.ROOT) return ROUTES.ROOT;
  if (pathname.startsWith('/users/')) return ROUTES.USERS.ROOT;
  if (pathname.startsWith('/auth/')) return ROUTES.ROOT;
  if (pathname.startsWith('/account/')) return ROUTES.ACCOUNT.ROOT;
  if (pathname.startsWith('/admin')) return ROUTES.ACCOUNT.ROOT;

  return ROUTES.ROOT;
}

function getSubPageAction(pathname: string): SubPageAction | null {
  if (pathname === ROUTES.VENUES.ROOT) {
    return { href: ROUTES.VENUES.ADD, label: 'Add Venue' };
  }

  if (pathname === ROUTES.ORGANIZATIONS.ROOT) {
    return { href: ROUTES.ACCOUNT.ORGANIZATIONS.CREATE, label: 'Create Organization' };
  }

  return null;
}

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN }: MainNavigationProps) {
  const { data: session } = useSession();
  const { themeMode, setThemeMode, toolbarAction, toolbarTitle } = useAppContext();
  const pathname = normalizePathname(usePathname());
  const searchParams = useSearchParams();
  const router = useRouter();

  // Unread badges are primarily websocket-driven; queries provide initial/fallback state.
  const { unreadCount } = useUnreadNotificationCount();
  const { unreadCount: unreadChatCount } = useUnreadChatCount();

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [profilesMenuAnchorEl, setProfilesMenuAnchorEl] = useState<null | HTMLElement>(null);

  const hasAccountTabParam = pathname === ROUTES.ACCOUNT.ROOT && Boolean(searchParams.get('tab'));
  const showMobileBackOnAccountTab = !isMdUp && hasAccountTabParam;
  const isProfilesMenuOpen = Boolean(profilesMenuAnchorEl);
  const isMainRoute = isMainShellRoute(pathname);
  const backFallback = hasAccountTabParam ? ROUTES.ACCOUNT.ROOT : getBackFallback(pathname, session?.user?.username);
  const subPageAction = !isMainRoute ? getSubPageAction(pathname) : null;
  const hasToolbarAction = Boolean(toolbarAction);
  const hasToolbarTitle = Boolean(toolbarTitle);
  const showDesktopDefaultActions = !hasToolbarAction || isMainRoute;
  const showToolbarAction = hasToolbarAction && (!isMainRoute || !isMdUp);
  const showMobileMainTitle = isMainRoute && !isMdUp && hasToolbarTitle;

  const handleProfilesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfilesMenuAnchorEl(event.currentTarget);
  };

  const handleProfilesMenuClose = () => {
    setProfilesMenuAnchorEl(null);
  };

  const profilesMenuId = 'profiles-menu-id';
  const toggleThemeMode = () => {
    setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'));
  };
  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
      return;
    }

    router.push(backFallback);
  };

  const themeToggleButton = (
    <IconButton
      size="large"
      aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleThemeMode}
      sx={{
        display: { xs: 'none', md: 'inline-flex' },
        border: '1px solid',
        borderColor: 'divider',
        color: 'text.secondary',
        height: 40,
        width: 40,
        '&:hover': {
          bgcolor: 'action.hover',
          color: 'text.primary',
        },
      }}
    >
      {themeMode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
    </IconButton>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1000,
          backgroundImage: 'none',
        }}
        color="primary"
        enableColorOnDark
      >
        <Toolbar
          disableGutters
          color="primary"
          sx={{
            position: 'relative',
            px: { xs: 2.25, sm: 3, md: 4 },
            minHeight: { xs: 58, md: 64 },
            gap: { xs: 1, md: 1.25 },
          }}
        >
          {isMainRoute && !showMobileBackOnAccountTab ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Logo />
            </Box>
          ) : (
            <IconButton
              aria-label="Go back"
              onClick={handleBack}
              sx={{
                color: 'text.primary',
                height: { xs: 40, md: 44 },
                width: { xs: 40, md: 44 },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ArrowBack />
            </IconButton>
          )}

          {showMobileMainTitle ? (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                maxWidth: { xs: 'calc(100% - 180px)', sm: 'calc(100% - 280px)' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {toolbarTitle}
            </Box>
          ) : null}

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              ml: 3,
            }}
          >
            <NavLinksList variant="toolbar" />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {!isAuthN && showDesktopDefaultActions && (
            <Box
              component="div"
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              {themeToggleButton}

              <Button
                variant="text"
                color="inherit"
                component={Link}
                href={ROUTES.AUTH.LOGIN}
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                }}
              >
                Log in
              </Button>

              <Button
                variant="contained"
                color="secondary"
                component={Link}
                href={ROUTES.AUTH.REGISTER}
                sx={{ borderRadius: WEB_RADIUS.control }}
              >
                Join {APP_NAME}
              </Button>
            </Box>
          )}

          {isAuthN && showDesktopDefaultActions && (
            <Box
              component="div"
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
              }}
            >
              {themeToggleButton}

              <Button
                variant="contained"
                color="secondary"
                startIcon={<ControlPointOutlined />}
                component={Link}
                href={ROUTES.ACCOUNT.EVENTS.CREATE}
                sx={{ display: { xs: 'none', md: 'inline-flex' }, borderRadius: WEB_RADIUS.control }}
              >
                Host an event
              </Button>

              <IconButton
                size="large"
                aria-label="mails"
                component={Link}
                href={ROUTES.ACCOUNT.MESSAGES}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  color: 'text.secondary',
                  padding: 0,
                  marginX: 1.5,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <Badge
                  badgeContent={unreadChatCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      height: 16,
                      minWidth: 16,
                      fontWeight: 700,
                    },
                  }}
                >
                  <MailOutline />
                </Badge>
              </IconButton>

              <IconButton
                size="large"
                aria-label="notifications"
                component={Link}
                href={ROUTES.ACCOUNT.NOTIFICATIONS}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  color: 'text.secondary',
                  padding: 0,
                  marginX: 1.5,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      height: 16,
                      minWidth: 16,
                      fontWeight: 700,
                    },
                  }}
                >
                  <NotificationsOutlined />
                </Badge>
              </IconButton>

              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls={profilesMenuId}
                aria-haspopup="true"
                onClick={handleProfilesMenuOpen}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  borderRadius: WEB_RADIUS.control,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  padding: 0,
                }}
              >
                <Avatar
                  src={getAvatarSrc(session?.user)}
                  sx={{
                    width: 36,
                    height: 36,
                    fontWeight: 700,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                />
              </IconButton>

              {/* overflow menu hidden on mobile; drawer contains these items to avoid duplicates */}
            </Box>
          )}

          {showToolbarAction ? (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>{toolbarAction}</Box>
          ) : null}

          {subPageAction && !hasToolbarAction ? (
            <IconButton
              aria-label={subPageAction.label}
              component={Link}
              href={subPageAction.href}
              sx={{
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: WEB_RADIUS.pill,
                color: 'primary.main',
                display: { xs: 'inline-flex', md: 'none' },
                height: 28,
                ml: 'auto',
                width: 28,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.light',
                },
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          ) : null}
        </Toolbar>
      </AppBar>

      <Box component="div">
        {isMdUp && (
          <ProfilesMenu
            ProfilesMenuAnchorEl={profilesMenuAnchorEl}
            ProfilesMenuId={profilesMenuId}
            handleProfilesMenuClose={handleProfilesMenuClose}
            isProfilesMenuOpen={isProfilesMenuOpen}
          />
        )}
      </Box>
    </Box>
  );
}
