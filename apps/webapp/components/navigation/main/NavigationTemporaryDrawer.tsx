'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
} from '@mui/material';
import {
  Clear,
  Menu,
  ControlPointOutlined,
  Settings,
  Security,
  Logout,
  Business,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useApolloClient } from '@apollo/client';
import NavLinksList from '@/components/navigation/main/NavLinksList';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { ROUTES } from '@/lib/constants';
import { getDisplayName, getAvatarSrc, logger } from '@/lib/utils';
import { useIsAdmin } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';

export default function TemporaryDrawer({ isAuthN }: { isAuthN: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const apolloClient = useApolloClient();
  const isAdmin = useIsAdmin();
  const { themeMode, setThemeMode } = useAppContext();

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box sx={{ width: 280 }} role="presentation" onClick={toggleDrawer(false)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        {isAuthN && session?.user ? (
          <Link
            href={ROUTES.ACCOUNT.PROFILE}
            aria-label="View profile"
            style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          >
            <Avatar
              src={getAvatarSrc(session.user)}
              alt={getDisplayName(session.user)}
              sx={{ width: 48, height: 48 }}
            />
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                {getDisplayName(session.user)}
              </Typography>
              {session.user.email && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {session.user.email}
                </Typography>
              )}
            </Box>
          </Link>
        ) : (
          <Box />
        )}

        <IconButton onClick={toggleDrawer(false)} aria-label="close drawer">
          <Clear />
        </IconButton>
      </Box>

      {isAuthN && <Divider sx={{ my: 1 }} />}

      {isAuthN && (
        <>
          <Box sx={{ px: 2, pb: 1 }}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<ControlPointOutlined />}
              component={Link}
              href={ROUTES.ACCOUNT.EVENTS.CREATE}
            >
              Host an event
            </Button>
          </Box>
        </>
      )}

      <Divider sx={{ my: 1 }} />

      <NavLinksList variant="drawer" />

      <Divider sx={{ color: 'primary', my: 1 }} />

      {isAuthN && (
        <>
          <List>
            <ListItem disablePadding>
              <ListItemButton component={Link} href={ROUTES.ACCOUNT.ORGANIZATIONS.ROOT}>
                <ListItemIcon>
                  <Business />
                </ListItemIcon>
                <ListItemText primary={'My Organizations'} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton component={Link} href={ROUTES.ACCOUNT.ROOT}>
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary={'Settings'} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'))}
              >
                <ListItemIcon>{themeMode === 'dark' ? <LightMode /> : <DarkMode />}</ListItemIcon>
                <ListItemText primary={themeMode === 'dark' ? 'Light mode' : 'Dark mode'} />
              </ListItemButton>
            </ListItem>

            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton component={Link} href={ROUTES.ADMIN.ROOT}>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText primary={'Admin Portal'} />
                </ListItemButton>
              </ListItem>
            )}
          </List>

          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={async () => {
                  try {
                    await apolloClient.clearStore();
                  } catch {
                    // Best-effort cache clear
                  }
                  try {
                    await logoutUserAction();
                  } catch (error) {
                    // signOut may throw NEXT_REDIRECT — that's expected
                    if (error instanceof Error && (error as any).digest === 'NEXT_REDIRECT') {
                      throw error;
                    }
                    // Log unexpected errors to aid debugging
                    // eslint-disable-next-line no-console
                    logger.error('Failed to log out user', error);
                  } finally {
                    setOpen(false);
                  }
                }}
              >
                <ListItemIcon>
                  <Logout />
                </ListItemIcon>
                <ListItemText primary={'Logout'} />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}

      {!isAuthN && (
        <>
          <Box sx={{ px: 2, pt: 1 }}>
            <Button variant="contained" color="secondary" fullWidth component={Link} href={ROUTES.AUTH.REGISTER}>
              Join Gatherle
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <div>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        onClick={toggleDrawer(true)}
        edge="end"
        size="large"
        sx={{
          mr: 2,
          ml: 3,
          ...(open && { display: 'none' }),
        }}
      >
        <Menu color="primary" />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}
