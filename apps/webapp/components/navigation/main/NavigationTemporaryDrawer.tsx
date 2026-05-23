'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import NavLinksList from '@/components/navigation/main/NavLinksList';
import { ROUTES } from '@/lib/constants';
import { getDisplayName, getAvatarSrc } from '@/lib/utils';
import { useIsAdmin } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';
import { APP_NAME } from '@/lib/constants';
import { useLogout } from '@/hooks/useLogout';
import { socialLinks } from '@/components/footer/NavigationItems';

const drawerItemSx = {
  borderRadius: 2.25,
  gap: 1.5,
  minHeight: 56,
  px: 1,
  py: 1.35,
  '& .MuiListItemIcon-root': {
    color: 'text.secondary',
    minWidth: 30,
  },
  '& .MuiListItemText-primary': {
    fontSize: '1rem',
    fontWeight: 600,
  },
};

export default function TemporaryDrawer({ isAuthN }: { isAuthN: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const { themeMode, setThemeMode } = useAppContext();
  const { logout } = useLogout();
  const drawerWidth = 'min(420px, max(280px, 62vw))';

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const profileHref = useMemo(
    () => (session?.user?.username ? ROUTES.USERS.USER(session.user.username) : ROUTES.ACCOUNT.ROOT),
    [session?.user?.username],
  );

  const DrawerList = (
    <Box
      sx={{
        bgcolor: 'background.paper',
        height: '100%',
        px: 2.75,
        py: 2,
        width: drawerWidth,
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        {isAuthN && session?.user ? (
          <Link
            href={profileHref}
            aria-label="View profile"
            style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, textDecoration: 'none' }}
          >
            <Avatar
              src={getAvatarSrc(session.user)}
              alt={getDisplayName(session.user)}
              sx={{ width: 62, height: 62, fontWeight: 800 }}
            />
            <Box sx={{ minWidth: 0, pt: 0.25 }}>
              <Typography noWrap variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.25 }}>
                {getDisplayName(session.user)}
              </Typography>
              {session.user.username && (
                <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>
                  @{session.user.username}
                </Typography>
              )}
            </Box>
          </Link>
        ) : (
          <Box />
        )}

        <IconButton onClick={toggleDrawer(false)} aria-label="close drawer" sx={{ color: 'text.secondary' }}>
          <Clear />
        </IconButton>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        fullWidth
        startIcon={isAuthN ? <ControlPointOutlined /> : undefined}
        component={Link}
        href={isAuthN ? ROUTES.ACCOUNT.EVENTS.CREATE : ROUTES.AUTH.REGISTER}
        sx={{ borderRadius: 2, fontWeight: 800, mb: 2.25, py: 1.65 }}
      >
        {isAuthN ? 'Host an event' : `Join ${APP_NAME}`}
      </Button>

      <Divider sx={{ mb: 1.5 }} />

      <NavLinksList variant="drawer" />

      <Divider sx={{ my: 1.5 }} />

      {isAuthN && (
        <>
          <List>
            <ListItem disablePadding>
              <ListItemButton component={Link} href={ROUTES.ACCOUNT.ORGANIZATIONS.ROOT} sx={drawerItemSx}>
                <ListItemIcon>
                  <Business />
                </ListItemIcon>
                <ListItemText primary={'My Organizations'} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton component={Link} href={ROUTES.ACCOUNT.ROOT} sx={drawerItemSx}>
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary={'Settings'} />
              </ListItemButton>
            </ListItem>

            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton component={Link} href={ROUTES.ADMIN.ROOT} sx={drawerItemSx}>
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
                sx={drawerItemSx}
                onClick={async () => {
                  setOpen(false);
                  await logout();
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

      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'))}
            sx={drawerItemSx}
          >
            <ListItemIcon>{themeMode === 'dark' ? <LightMode /> : <DarkMode />}</ListItemIcon>
            <ListItemText primary={themeMode === 'dark' ? 'Light mode' : 'Dark mode'} />
          </ListItemButton>
        </ListItem>
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ px: 1, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            display: 'block',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            mb: 1.25,
          }}
        >
          Follow Gatherle
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {socialLinks.map((social) => (
            <IconButton
              aria-label={social.name}
              component={Link}
              href={social.href}
              key={social.name}
              rel="noopener noreferrer"
              size="small"
              target="_blank"
              sx={{
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.primary',
                height: 40,
                width: 40,
                '&:hover': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                },
              }}
            >
              {social.icon}
            </IconButton>
          ))}
        </Box>
      </Box>
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
          ml: 0.5,
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
