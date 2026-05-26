'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import type { IconType } from 'react-icons';
import {
  FiBriefcase,
  FiGrid,
  FiInstagram,
  FiLinkedin,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMoon,
  FiMusic,
  FiPlusCircle,
  FiSettings,
  FiShield,
  FiSun,
  FiTwitter,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { ROUTES } from '@/lib/constants';
import { getDisplayName, getAvatarSrc } from '@/lib/utils';
import { useIsAdmin } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';
import { APP_NAME } from '@/lib/constants';
import { useLogout } from '@/hooks/useLogout';

type DrawerLinkItem = {
  href: string;
  icon: IconType;
  label: string;
};

type DrawerActionItem = {
  icon: IconType;
  keepOpen?: boolean;
  label: string;
  onClick: () => void;
};

type SocialLinkConfig = {
  href: string;
  icon: IconType;
  label: string;
};

const drawerItemSx = {
  borderRadius: 2.25,
  gap: 2.25,
  minHeight: 56,
  px: 1,
  py: 1.35,
  justifyContent: 'flex-start',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

const socialLinks: SocialLinkConfig[] = [
  { href: 'https://www.instagram.com/gatherleofficial', icon: FiInstagram, label: 'Instagram' },
  { href: 'https://www.tiktok.com/@gatherle', icon: FiMusic, label: 'TikTok' },
  { href: 'https://www.linkedin.com/company/gatherle', icon: FiLinkedin, label: 'LinkedIn' },
  { href: 'https://x.com/getgatherle', icon: FiTwitter, label: 'X' },
];

function DrawerFeatherIcon({ icon: Icon, size = 22 }: { icon: IconType; size?: number }) {
  return (
    <Box
      component="span"
      sx={{
        alignItems: 'center',
        color: 'text.secondary',
        display: 'inline-flex',
        justifyContent: 'center',
        lineHeight: 0,
      }}
    >
      <Icon size={size} />
    </Box>
  );
}

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

  const primaryItems: DrawerLinkItem[] = [
    { href: ROUTES.CATEGORIES.ROOT, icon: FiGrid, label: 'Categories' },
    { href: ROUTES.ORGANIZATIONS.ROOT, icon: FiGrid, label: 'Organizations' },
    { href: ROUTES.VENUES.ROOT, icon: FiMapPin, label: 'Venues' },
    { href: ROUTES.USERS.ROOT, icon: FiUsers, label: 'Community' },
  ];
  const accountItems: Array<DrawerLinkItem | DrawerActionItem> = isAuthN
    ? [
        { href: ROUTES.ACCOUNT.ORGANIZATIONS.ROOT, icon: FiBriefcase, label: 'My Organizations' },
        { href: ROUTES.ACCOUNT.TAB('account'), icon: FiSettings, label: 'Settings' },
        ...(isAdmin ? ([{ href: ROUTES.ADMIN.ROOT, icon: FiShield, label: 'Admin Portal' }] as const) : []),
        {
          icon: FiLogOut,
          label: 'Logout',
          onClick: async () => {
            setOpen(false);
            await logout();
          },
        },
      ]
    : [];
  const appearanceItem: DrawerActionItem = {
    icon: themeMode === 'dark' ? FiSun : FiMoon,
    keepOpen: true,
    label: themeMode === 'dark' ? 'Light mode' : 'Dark mode',
    onClick: () => setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark')),
  };

  const renderDrawerItem = (item: DrawerLinkItem | DrawerActionItem) => {
    const content = (
      <>
        <DrawerFeatherIcon icon={item.icon} />
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {item.label}
        </Typography>
      </>
    );

    if ('href' in item) {
      return (
        <ListItem disablePadding key={item.label}>
          <ListItemButton component={Link} href={item.href} onClick={toggleDrawer(false)} sx={drawerItemSx}>
            {content}
          </ListItemButton>
        </ListItem>
      );
    }

    return (
      <ListItem disablePadding key={item.label}>
        <ListItemButton
          onClick={() => {
            if (!item.keepOpen) {
              setOpen(false);
            }

            void item.onClick();
          }}
          sx={drawerItemSx}
        >
          {content}
        </ListItemButton>
      </ListItem>
    );
  };

  const DrawerList = (
    <Box
      sx={{
        bgcolor: 'background.paper',
        height: '100%',
        px: 2.75,
        py: 2,
        width: '100%',
      }}
      role="presentation"
    >
      <Box sx={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', mb: isAuthN ? 2 : 1.25 }}>
        {isAuthN && session?.user ? (
          <Link
            href={profileHref}
            onClick={toggleDrawer(false)}
            aria-label="View profile"
            style={{ alignItems: 'center', display: 'flex', gap: 14, minWidth: 0, textDecoration: 'none' }}
          >
            <Avatar
              src={getAvatarSrc(session.user)}
              alt={getDisplayName(session.user)}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                fontWeight: 800,
                height: 62,
                width: 62,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'text.primary',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  maxWidth: 170,
                  wordBreak: 'break-word',
                }}
              >
                {getDisplayName(session.user)}
              </Typography>
              {session.user.username && (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontSize: '0.95rem', lineHeight: 1.3, mt: 0.5 }}
                >
                  @{session.user.username}
                </Typography>
              )}
            </Box>
          </Link>
        ) : (
          <Box />
        )}

        <IconButton
          onClick={toggleDrawer(false)}
          aria-label="close drawer"
          sx={{
            color: 'text.secondary',
            height: 34,
            width: 34,
          }}
        >
          <FiX size={28} />
        </IconButton>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        fullWidth
        startIcon={isAuthN ? <FiPlusCircle size={20} /> : undefined}
        component={Link}
        href={isAuthN ? ROUTES.ACCOUNT.EVENTS.CREATE : ROUTES.AUTH.REGISTER}
        onClick={toggleDrawer(false)}
        sx={{
          borderRadius: 2,
          boxShadow: 'none',
          fontSize: '1rem',
          fontWeight: 800,
          mb: 2.25,
          minHeight: 58,
          py: 1.65,
          '&:hover': {
            boxShadow: 'none',
          },
        }}
      >
        {isAuthN ? 'Host an event' : `Join ${APP_NAME}`}
      </Button>

      <Divider sx={{ mb: 1.5 }} />

      <List disablePadding>
        {primaryItems.map(renderDrawerItem)}
        {accountItems.map(renderDrawerItem)}
        {renderDrawerItem(appearanceItem)}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ px: 1, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            mb: 1.25,
          }}
        >
          Follow Gatherle
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {socialLinks.map((social) => (
            <IconButton
              aria-label={social.label}
              component="a"
              href={social.href}
              key={social.label}
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
              <social.icon size={18} />
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
        <Box component="span" sx={{ color: 'primary.main', display: 'inline-flex', lineHeight: 0 }}>
          <FiMenu size={26} />
        </Box>
      </IconButton>
      <Drawer
        anchor="right"
        open={open}
        onClose={toggleDrawer(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: 'none',
              borderLeft: '1px solid',
              borderColor: 'divider',
              width: drawerWidth,
            },
          },
        }}
      >
        {DrawerList}
      </Drawer>
    </div>
  );
}
