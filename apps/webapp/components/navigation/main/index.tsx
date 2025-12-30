'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { MailOutline, MoreVert, NotificationsOutlined, ControlPointOutlined } from '@mui/icons-material';
import Avatar from '@mui/material/Avatar';
import NotificationsMenu from '@/components/navigation/main/navigation-notifications-items';
import ProfilesMenu from '@/components/navigation/main/navigation-profiles-items';
import TemporaryDrawer from '@/components/navigation/main/navigation-temporary-drawer';
import { Button, Chip } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import Logo from '@/components/logo';

type MainNavigationProps = {
  isAuthN: boolean;
};

const navLinks = [
  { label: 'Events', href: ROUTES.EVENTS.ROOT },
  { label: 'Organizations', href: ROUTES.ORGANIZATIONS.ROOT },
  { label: 'Venues', href: ROUTES.VENUES.ROOT },
  { label: 'Community', href: ROUTES.USERS.ROOT },
  { label: 'For hosts', href: ROUTES.ACCOUNT.EVENTS.CREATE },
];

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN }: MainNavigationProps) {
  const router = useRouter();

  const [profilesMenuAnchorEl, setProfilesMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsMenuAnchorEl, setNotificationsMenuAnchorEl] = useState<null | HTMLElement>(null);

  const isProfilesMenuOpen = Boolean(profilesMenuAnchorEl);
  const isNotificationsMenuOpen = Boolean(notificationsMenuAnchorEl);

  const handleProfilesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfilesMenuAnchorEl(event.currentTarget);
  };

  const handleProfilesMenuClose = () => {
    setProfilesMenuAnchorEl(null);
    handleNotificationsMenuClose();
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsMenuAnchorEl(null);
  };

  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsMenuAnchorEl(event.currentTarget);
  };

  const profilesMenuId = 'profiles-menu-id';
  const notificationsMenuId = 'notifications-menu-id';

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
            minHeight: 58,
            gap: 1.25,
          }}
        >
          <Box component="div" sx={{ display: { xs: 'flex', md: 'none' } }}>
            <TemporaryDrawer />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Logo />
            <Chip
              label="Live beta"
              size="small"
              color="secondary"
              variant="outlined"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                fontWeight: 700,
                letterSpacing: 0.6,
                borderRadius: 10,
              }}
            />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              ml: 3,
            }}
          >
            {navLinks.map(link => (
              <Button
                key={link.label}
                component={Link}
                href={link.href}
                color="inherit"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  borderRadius: 2,
                  '&:hover': { color: 'text.primary', backgroundColor: 'transparent' },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {!isAuthN && (
            <Box
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Button
                variant="text"
                color="inherit"
                onClick={() => router.push(ROUTES.AUTH.LOGIN)}
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
                onClick={() => router.push(ROUTES.AUTH.REGISTER)}
                sx={{ borderRadius: 10 }}
              >
                Join Ntlango
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
                onClick={() => router.push(ROUTES.ACCOUNT.EVENTS.CREATE)}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderRadius: 10 }}
              >
                Host an event
              </Button>

              <IconButton
                size="large"
                aria-label="mails"
                component={Link}
                href={ROUTES.ACCOUNT.MESSAGES}
                sx={{
                  color: 'text.secondary',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <MailOutline />
              </IconButton>

              <IconButton
                size="large"
                aria-label="notifications"
                component={Link}
                href={ROUTES.ACCOUNT.NOTIFICATIONS}
                sx={{
                  color: 'text.secondary',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <NotificationsOutlined />
              </IconButton>

              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls={profilesMenuId}
                aria-haspopup="true"
                onClick={handleProfilesMenuOpen}
                sx={{
                  borderRadius: 12,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontWeight: 700,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  A
                </Avatar>
              </IconButton>

              <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
                <IconButton
                  size="large"
                  aria-label="show more"
                  aria-controls={notificationsMenuId}
                  aria-haspopup="true"
                  onClick={handleNotificationsMenuOpen}
                  color="primary"
                >
                  <MoreVert />
                </IconButton>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box component="div">
        <ProfilesMenu
          ProfilesMenuAnchorEl={profilesMenuAnchorEl}
          ProfilesMenuId={profilesMenuId}
          handleProfilesMenuClose={handleProfilesMenuClose}
          isProfilesMenuOpen={isProfilesMenuOpen}
        />

        <NotificationsMenu
          NotificationsMenuAnchorEl={notificationsMenuAnchorEl}
          NotificationsMenuId={notificationsMenuId}
          handleNotificationsMenuClose={handleNotificationsMenuClose}
          isNotificationsMenuOpen={isNotificationsMenuOpen}
        />
      </Box>
    </Box>
  );
}
