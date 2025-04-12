'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { Mail, MoreVert, Notifications } from '@mui/icons-material';
import Avatar from '@mui/material/Avatar';
import NotificationsMenu from '@/components/navigation/main/navigation-notifications-items';
import ProfilesMenu from '@/components/navigation/main/navigation-profiles-items';
import TemporaryDrawer from '@/components/navigation/main/navigation-temporary-drawer';
import ToggleThemeMode from '@/components/theme/toggle-theme-mode';
import { Button } from '@mui/material';
import { useCustomAppContext } from '@/components/app-context';
import { ROUTES } from '@/lib/constants';
import Logo from '@/components/logo';

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN }: { isAuthN: boolean }) {
  const router = useRouter();
  const { themeMode, setThemeMode } = useCustomAppContext();

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
      <AppBar position="fixed" sx={{ boxShadow: 'none', zIndex: 1000 }}>
        <Toolbar disableGutters>
          <Box component="div" sx={{ display: { xs: isAuthN ? 'none' : 'flex', md: 'none' } }}>
            <TemporaryDrawer />
          </Box>

          <Logo />

          <Box sx={{ flexGrow: 1 }} />

          <Box component="div" sx={{}}>
            <ToggleThemeMode setThemeMode={setThemeMode} themeMode={themeMode} />
          </Box>

          <Box
            component="div"
            sx={{
              display: { xs: 'none', sm: isAuthN ? 'none' : 'flex' },
              marginX: 2,
            }}
          >
            <Button
              variant="text"
              color="secondary"
              onClick={() => router.push(ROUTES.AUTH.LOGIN)}
              sx={{
                marginX: 2,
              }}
            >
              Log In
            </Button>

            <Button
              variant="contained"
              color="secondary" onClick={() => router.push(ROUTES.AUTH.REGISTER)}
            >
              Sign Up
            </Button>
          </Box>

          <Box component="div" display="flex" sx={{ display: { xs: isAuthN ? 'flex' : 'none' } }}>
            <Box sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}>
              <IconButton size="large" aria-label="mails" color="primary">
                <Link href={ROUTES.ACCOUNT.MESSAGES}>
                  <Mail />
                </Link>
              </IconButton>
              <IconButton size="large" aria-label="notifications" color="primary">
                <Link href={ROUTES.ACCOUNT.NOTIFICATIONS}>
                  <Notifications />
                </Link>
              </IconButton>
            </Box>

            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={profilesMenuId}
              aria-haspopup="true"
              onClick={handleProfilesMenuOpen}
              color="primary"
              sx={{ mr: 1 }}
            >
              <Avatar color={'primary'} sx={{ width: 32, height: 32 }}>
                A
              </Avatar>
            </IconButton>

            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="show more"
                aria-controls={profilesMenuId}
                aria-haspopup="true"
                onClick={handleNotificationsMenuOpen}
                color="primary"
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
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
