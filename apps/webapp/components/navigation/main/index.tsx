'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { MailOutline, MoreVert, NotificationsOutlined } from '@mui/icons-material';
import Avatar from '@mui/material/Avatar';
import NotificationsMenu from '@/components/navigation/main/navigation-notifications-items';
import ProfilesMenu from '@/components/navigation/main/navigation-profiles-items';
import TemporaryDrawer from '@/components/navigation/main/navigation-temporary-drawer';
import { Button, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import Logo from '@/components/logo';

type MainNavigationProps = {
  isAuthN: boolean;
  onHeightChange?: (height: number) => void;
};

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN, onHeightChange }: MainNavigationProps) {
  const appBarRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (appBarRef.current) {
      const height = appBarRef.current.offsetHeight; // Get the height of the AppBar
      if (onHeightChange) {
        onHeightChange(height); // Pass the height to the parent component
      }
    }
  }, [onHeightChange]);

  const profilesMenuId = 'profiles-menu-id';
  const notificationsMenuId = 'notifications-menu-id';

  return (
    <Box sx={{ flexGrow: 1 }} ref={appBarRef}>
      <AppBar
        position="fixed"
        sx={{ boxShadow: 'none', zIndex: 1000 }}
        color="primary"
        enableColorOnDark
      >
        <Toolbar disableGutters color="primary">
          <Box component="div" sx={{ display: { xs: isAuthN ? 'none' : 'flex', md: 'none' } }}>
            <TemporaryDrawer />
          </Box>

          <Logo />

          <Box sx={{ flexGrow: 1 }} />

          {/* Auth Buttons */}
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

          {/* Logged in user Buttons */}
          <Box
            component="div"
            display="flex"
            sx={{
              display: { xs: isAuthN ? 'flex' : 'none' },
            }}
          >
            {/* Show only on large screens */}
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Link href={ROUTES.ACCOUNT.MESSAGES}>
                <IconButton
                  size="large"
                  aria-label="mails"
                  disableRipple
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.primary',
                      '&:hover': {
                        color: 'secondary.main'
                      }
                    }}
                  >
                    <MailOutline />
                    Messages
                  </Typography>
                </IconButton>
              </Link>

              <Link href={ROUTES.ACCOUNT.NOTIFICATIONS}>
                <IconButton
                  size="large"
                  aria-label="mails"
                  disableRipple
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.primary',
                      '&:hover': {
                        color: 'secondary.main'
                      }
                    }}
                  >
                    <NotificationsOutlined />
                    Notifications
                  </Typography>
                </IconButton>
              </Link>
            </Box>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              height: '100%',
            }}>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls={profilesMenuId}
                aria-haspopup="true"
                onClick={handleProfilesMenuOpen}
                disableRipple
                sx={{
                  '&:hover': {
                    color: 'secondary.main'
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    color: 'black',
                    '&:hover': {
                      backgroundColor: 'secondary.main'
                    }
                  }}
                >
                  A
                </Avatar>
              </IconButton>
            </Box>

            {/* Show only on smaller screens */}
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
