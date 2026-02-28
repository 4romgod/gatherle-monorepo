'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import { MailOutline, NotificationsOutlined, ControlPointOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ProfilesMenu from '@/components/navigation/main/NavigationProfileItems';
import TemporaryDrawer from '@/components/navigation/main/NavigationTemporaryDrawer';
import { Button } from '@mui/material';
import { ROUTES, APP_NAME } from '@/lib/constants';
import NavLinksList from '@/components/navigation/main/NavLinksList';
import { getAvatarSrc } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useUnreadChatCount, useUnreadNotificationCount } from '@/hooks';
import Logo from '@/components/logo';

type MainNavigationProps = {
  isAuthN: boolean;
};

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN }: MainNavigationProps) {
  const { data: session } = useSession();

  // Unread badges are primarily websocket-driven; queries provide initial/fallback state.
  const { unreadCount } = useUnreadNotificationCount();
  const { unreadCount: unreadChatCount } = useUnreadChatCount();

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [profilesMenuAnchorEl, setProfilesMenuAnchorEl] = useState<null | HTMLElement>(null);

  const isProfilesMenuOpen = Boolean(profilesMenuAnchorEl);

  const handleProfilesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfilesMenuAnchorEl(event.currentTarget);
  };

  const handleProfilesMenuClose = () => {
    setProfilesMenuAnchorEl(null);
  };

  const profilesMenuId = 'profiles-menu-id';

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1000,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
        }}
        color="primary"
        enableColorOnDark
      >
        <Toolbar
          disableGutters
          color="primary"
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            minHeight: 64,
            gap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Logo />
          </Box>

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

          {!isAuthN && (
            <Box
              component="div"
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1.5,
              }}
            >
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
                sx={{ borderRadius: 10 }}
              >
                Join {APP_NAME}
              </Button>
            </Box>
          )}

          {isAuthN && (
            <Box
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ControlPointOutlined />}
                component={Link}
                href={ROUTES.ACCOUNT.EVENTS.CREATE}
                sx={{ display: { xs: 'none', md: 'inline-flex' }, borderRadius: 10 }}
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
                  borderRadius: 12,
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

          <Box component="div" sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto' }}>
            <TemporaryDrawer isAuthN={isAuthN} />
          </Box>
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
