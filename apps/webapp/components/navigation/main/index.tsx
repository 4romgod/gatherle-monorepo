'use client';

import React, { Dispatch, SetStateAction, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Avatar from '@mui/material/Avatar';
import MoreIcon from '@mui/icons-material/MoreVert';
import SearchInput from '@/components/search/search-box';
import NotificationsMenu from '@/components/navigation/main/navigation-notifications-items';
import ProfilesMenu from '@/components/navigation/main/navigation-profiles-items';
import TemporaryDrawer from '@/components/navigation/main/navigation-temporary-drawer';
import ToggleThemeMode, { ToggleThemeModeProps } from '@/components/theme/toggle-theme-mode';
import { Button } from '@mui/material';
import Logo from '@/components/logo';
import SignupModal from '@/components/signup/signup-modal';
import LoginModal from '@/components/login/login-modal';
import Link from 'next/link';
import { useCustomAppContext } from '@/components/app-context';

export type ToggleAuthNProps = {
  isAuthN: boolean;
  setIsAuthN: Dispatch<SetStateAction<boolean>>;
};

export type PrimaryNavBarProps = ToggleAuthNProps & ToggleThemeModeProps;
/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation() {
  const { isAuthN, setIsAuthN, themeMode, setThemeMode } = useCustomAppContext();

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
      <AppBar position="fixed">
        <Toolbar disableGutters>
          <Box component="div" sx={{ display: { xs: isAuthN ? 'none' : 'flex', md: 'none' } }}>
            <TemporaryDrawer />
          </Box>

          <Logo />

          <Box sx={{ flexGrow: 1 }} />

          {/* <SearchInput sx={{ display: { xs: 'none', md: 'flex' } }} /> */}

          <ToggleThemeMode setThemeMode={setThemeMode} themeMode={themeMode} />

          <Box component="div" sx={{ display: { xs: 'none', sm: isAuthN ? 'none' : 'flex' } }}>
            <LoginModal
              triggerButton={
                <Button variant="outlined" color="secondary">
                  Log In
                </Button>
              }
              setIsAuthN={setIsAuthN}
            />

            <SignupModal
              triggerButton={
                <Button variant="contained" color="secondary">
                  Sign Up
                </Button>
              }
            />
          </Box>

          <Box component="div" display="flex" sx={{ display: { xs: isAuthN ? 'flex' : 'none' } }}>
            <Box sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}>
              <IconButton size="large" aria-label="mails" color="primary">
                <Link href={'/messages'}>
                  <MailIcon />
                </Link>
              </IconButton>
              <IconButton size="large" aria-label="notifications" color="primary">
                <Link href={'/notifications'}>
                  <NotificationsIcon />
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
                <MoreIcon />
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
