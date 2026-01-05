'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { MailOutline, NotificationsOutlined, ControlPointOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ProfilesMenu from '@/components/navigation/main/navigation-profiles-items';
import TemporaryDrawer from '@/components/navigation/main/navigation-temporary-drawer';
import { Button } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import NavLinksList from '@/components/navigation/main/nav-links-list';
import { getAvatarSrc, getDisplayName } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import Logo from '@/components/logo';

type MainNavigationProps = {
  isAuthN: boolean;
};

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function MainNavigation({ isAuthN }: MainNavigationProps) {
  const router = useRouter();
  const { data: session } = useSession();

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
            minHeight: 58,
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
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  padding: 0,
                  marginX: 1.5,
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
                  display: { xs: 'none', md: 'inline-flex' },
                  color: 'text.secondary',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  padding: 0,
                  marginX: 1.5,
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
