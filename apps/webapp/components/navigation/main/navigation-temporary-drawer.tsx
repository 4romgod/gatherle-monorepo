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
import { Clear, Login, Menu, ControlPointOutlined, MailOutline, NotificationsOutlined, Settings, Logout } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import NavLinksList from '@/components/navigation/main/nav-links-list';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { UserWithToken } from '@/data/graphql/types/graphql';

export default function TemporaryDrawer({ isAuthN }: { isAuthN: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const getDisplayName = () => {
    const user: UserWithToken | undefined = session?.user;
    if (!user) return 'Account';
    return [user.given_name, user.family_name].filter(Boolean).join(' ');
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box sx={{ width: 280 }} role="presentation" onClick={toggleDrawer(false)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        {isAuthN ? (
          <Link href={ROUTES.ACCOUNT.PROFILE} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <Avatar src={session?.user?.profile_picture ?? undefined} sx={{ width: 48, height: 48 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                {getDisplayName()}
              </Typography>
              {session?.user?.email && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {session.user.email}
                </Typography>
              )}
            </Box>
          </Link>
        ) : (
          <Box />
        )}

        <IconButton onClick={toggleDrawer(false)}>
          <Clear />
        </IconButton>
      </Box>

      <Divider sx={{ my: 1 }} />

      {isAuthN && (
        <List>
          <ListItem disablePadding>
            <Link href={ROUTES.ACCOUNT.ROOT}>
              <ListItemButton>
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary={'Settings'} />
              </ListItemButton>
            </Link>
          </ListItem>

          <ListItem disablePadding>
            <Link href={ROUTES.ACCOUNT.MESSAGES}>
              <ListItemButton>
                <ListItemIcon>
                  <MailOutline />
                </ListItemIcon>
                <ListItemText primary={'Messages'} />
              </ListItemButton>
            </Link>
          </ListItem>

          <ListItem disablePadding>
            <Link href={ROUTES.ACCOUNT.NOTIFICATIONS}>
              <ListItemButton>
                <ListItemIcon>
                  <NotificationsOutlined />
                </ListItemIcon>
                <ListItemText primary={'Notifications'} />
              </ListItemButton>
            </Link>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                logoutUserAction();
                setOpen(false);
              }}
            >
              <ListItemIcon>
                <Logout />
              </ListItemIcon>
              <ListItemText primary={'Logout'} />
            </ListItemButton>
          </ListItem>
        </List>
      )}

      <Divider sx={{ my: 1 }} />

      <NavLinksList variant="drawer" />

        <Divider sx={{ my: 1 }} />

        {!isAuthN && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => router.push(ROUTES.AUTH.LOGIN)}>
                <ListItemIcon>
                  <Login />
                </ListItemIcon>
                <ListItemText primary={'Log in'} />
              </ListItemButton>
            </ListItem>

            <Box sx={{ px: 2, pt: 1 }}>
              <Button variant="contained" color="secondary" fullWidth onClick={() => router.push(ROUTES.AUTH.REGISTER)}>
                Join Ntlango
              </Button>
            </Box>
          </>
        )}

        {isAuthN && (
          <Box sx={{ px: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<ControlPointOutlined />}
              onClick={() => router.push(ROUTES.ACCOUNT.EVENTS.CREATE)}
            >
              Host an event
            </Button>
          </Box>
        )}
    </Box>
  );

  return (
    <div>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        onClick={toggleDrawer(true)}
        edge="start"
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
