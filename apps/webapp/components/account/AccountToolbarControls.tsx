'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Add, Apartment, DarkMode, LightMode, Logout, MoreHoriz, Security, Settings } from '@mui/icons-material';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { UserRole } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { useLogout } from '@/hooks/useLogout';
import { useToolbarAction } from '@/hooks/useToolbarAction';
import { useToolbarTitle } from '@/hooks/useToolbarTitle';
import { ROUTES } from '@/lib/constants';
import { WEB_RADIUS } from '@/lib/constants/radius';

export type AccountToolbarUser = {
  family_name?: string | null;
  given_name?: string | null;
  profile_picture?: string | null;
  userRole?: UserRole | null;
  username?: string | null;
};

type AccountActionLink = {
  id: string;
  href: string;
  icon: ReactNode;
  label: string;
  secondaryText?: string;
};

type AccountActionButton = {
  disabled?: boolean;
  id: string;
  icon: ReactNode;
  keepOpen?: boolean;
  label: string;
  onClick: () => void;
  secondaryText?: string;
};

type AccountActionItem = AccountActionLink | AccountActionButton;

export default function AccountToolbarControls({ user }: { user: AccountToolbarUser }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { themeMode, setThemeMode } = useAppContext();
  const { isLoggingOut, logout } = useLogout();
  const [actionsOpen, setActionsOpen] = useState(false);
  const isAdmin = user.userRole === UserRole.Admin;
  const themeLabel = themeMode === 'dark' ? 'Light mode' : 'Dark mode';

  const toolbarTitle = useMemo(
    () => (
      <Typography
        component="span"
        sx={{
          color: 'text.primary',
          fontFamily: (theme) => theme.typography.body1.fontFamily,
          fontSize: { xs: '1.0625rem', sm: '1.125rem', md: '1.5rem' },
          fontWeight: 700,
          letterSpacing: { xs: '-0.01em', md: '-0.02em' },
          lineHeight: 1.1,
        }}
      >
        Account
      </Typography>
    ),
    [],
  );

  const toolbarAction = useMemo(
    () => (
      <Stack direction="row" alignItems="center" sx={{ gap: { xs: 0.25, sm: 1 } }}>
        <Button
          color="secondary"
          component={Link}
          href={ROUTES.ACCOUNT.EVENTS.CREATE}
          startIcon={<Add />}
          sx={{
            borderRadius: WEB_RADIUS.control,
            display: { xs: 'none', sm: 'inline-flex' },
            minHeight: { sm: 38, md: 40 },
            px: 1.75,
          }}
          variant="contained"
        >
          Host event
        </Button>

        <IconButton
          aria-label="Host an event"
          component={Link}
          href={ROUTES.ACCOUNT.EVENTS.CREATE}
          sx={{
            borderStyle: 'solid',
            borderWidth: { xs: 0, sm: 1 },
            borderColor: 'divider',
            color: { xs: 'primary.main', sm: 'text.primary' },
            display: { xs: 'inline-flex', sm: 'none' },
            height: { xs: 34, sm: 40 },
            width: { xs: 34, sm: 40 },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: 22, sm: 24 },
            },
            '&:hover': {
              bgcolor: { xs: 'transparent', sm: 'action.hover' },
            },
          }}
        >
          <Add />
        </IconButton>

        <IconButton
          aria-label="Open account actions"
          onClick={() => setActionsOpen(true)}
          sx={{
            borderStyle: 'solid',
            borderWidth: { xs: 0, sm: 1 },
            borderColor: 'divider',
            color: { xs: 'primary.main', sm: 'text.primary' },
            height: { xs: 34, sm: 40 },
            width: { xs: 34, sm: 40 },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: 23, sm: 24 },
            },
            '&:hover': {
              bgcolor: { xs: 'transparent', sm: 'action.hover' },
            },
          }}
        >
          <MoreHoriz />
        </IconButton>
      </Stack>
    ),
    [],
  );

  useToolbarAction(toolbarAction);
  useToolbarTitle(toolbarTitle);

  const actionItems: AccountActionItem[] = [
    {
      id: 'organizations',
      href: ROUTES.ACCOUNT.ORGANIZATIONS.ROOT,
      icon: <Apartment fontSize="small" />,
      label: 'My organizations',
      secondaryText: 'Manage your hosted spaces',
    },
    {
      id: 'settings',
      href: ROUTES.ACCOUNT.TAB('account'),
      icon: <Settings fontSize="small" />,
      label: 'Settings',
      secondaryText: 'Update account details and preferences',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin',
            href: ROUTES.ADMIN.ROOT,
            icon: <Security fontSize="small" />,
            label: 'Admin portal',
            secondaryText: 'Open moderation and admin tools',
          } satisfies AccountActionItem,
        ]
      : []),
    {
      id: 'theme',
      icon: themeMode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />,
      keepOpen: true,
      label: themeLabel,
      onClick: () => setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark')),
      secondaryText: 'Apply immediately on this device',
    },
    {
      disabled: isLoggingOut,
      id: 'logout',
      icon: <Logout fontSize="small" />,
      label: isLoggingOut ? 'Logging out...' : 'Logout',
      onClick: () => {
        void logout();
      },
      secondaryText: 'End this browser session',
    },
  ];

  return (
    <Drawer
      anchor={isMdUp ? 'right' : 'bottom'}
      open={actionsOpen}
      onClose={() => setActionsOpen(false)}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          borderTopLeftRadius: isMdUp ? 0 : WEB_RADIUS.panel,
          borderTopRightRadius: isMdUp ? 0 : WEB_RADIUS.panel,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          width: isMdUp ? 380 : '100%',
        },
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <List disablePadding sx={{ display: 'grid', gap: 0.75 }}>
          {actionItems.map((item) => {
            const content = (
              <>
                <ListItemIcon sx={{ color: 'text.secondary', minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.secondaryText}
                  primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 700 }}
                  secondaryTypographyProps={{ fontSize: '0.8125rem', lineHeight: 1.45 }}
                />
              </>
            );

            if ('href' in item) {
              return (
                <ListItemButton
                  component={Link}
                  href={item.href}
                  key={item.id}
                  onClick={() => setActionsOpen(false)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: WEB_RADIUS.card,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  {content}
                </ListItemButton>
              );
            }

            return (
              <ListItemButton
                disabled={item.disabled}
                key={item.id}
                onClick={() => {
                  if (!item.keepOpen) {
                    setActionsOpen(false);
                  }

                  item.onClick();
                }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: WEB_RADIUS.card,
                  px: 1.5,
                  py: 1,
                }}
              >
                {content}
              </ListItemButton>
            );
          })}
        </List>

        <Typography color="text.secondary" sx={{ mt: 2.5 }} variant="body2">
          Use this menu for account shortcuts, settings, theme, and session actions.
        </Typography>
      </Box>
    </Drawer>
  );
}
