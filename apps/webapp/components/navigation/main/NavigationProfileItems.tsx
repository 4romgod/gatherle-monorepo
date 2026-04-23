'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApolloClient } from '@apollo/client';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Divider, ListItemIcon, ListItemText } from '@mui/material';
import { AccountCircle, Logout, Settings, Business, Security, DarkMode, LightMode } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import NProgress from 'nprogress';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAppContext } from '@/hooks/useAppContext';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/utils';

type ProfilesMenuProps = {
  ProfilesMenuAnchorEl: HTMLElement | null;
  ProfilesMenuId: string;
  handleProfilesMenuClose: () => void;
  isProfilesMenuOpen: boolean;
};

export default function ProfilesMenu({
  ProfilesMenuAnchorEl,
  ProfilesMenuId,
  handleProfilesMenuClose,
  isProfilesMenuOpen,
}: ProfilesMenuProps) {
  const pathname = usePathname();
  const apolloClient = useApolloClient();
  const isAdmin = useIsAdmin();
  const { themeMode, setThemeMode } = useAppContext();
  const { data: session } = useSession();
  const profileUrl = session?.user?.username ? ROUTES.USERS.USER(session.user.username) : ROUTES.ACCOUNT.ROOT;

  const handleNavClick = (targetPath: string) => {
    // Only start progress bar if navigating to a different page
    if (pathname !== targetPath) {
      NProgress.start();
    }
    handleProfilesMenuClose();
  };

  return (
    <Menu
      anchorEl={ProfilesMenuAnchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={ProfilesMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isProfilesMenuOpen}
      onClose={handleProfilesMenuClose}
      slotProps={{
        paper: {
          style: {
            padding: '8px 0',
            minWidth: '200px',
          },
        },
      }}
    >
      <MenuItem component={Link} href={profileUrl} onClick={() => handleNavClick(profileUrl)}>
        <ListItemIcon>
          <AccountCircle fontSize="medium" />
        </ListItemIcon>
        <ListItemText
          slotProps={{
            primary: { fontSize: '1rem' },
          }}
        >
          Profile
        </ListItemText>
      </MenuItem>
      <MenuItem
        component={Link}
        href={ROUTES.ACCOUNT.ORGANIZATIONS.ROOT}
        onClick={() => handleNavClick(ROUTES.ACCOUNT.ORGANIZATIONS.ROOT)}
      >
        <ListItemIcon>
          <Business fontSize="medium" />
        </ListItemIcon>
        <ListItemText
          slotProps={{
            primary: { fontSize: '1rem' },
          }}
        >
          My Organizations
        </ListItemText>
      </MenuItem>
      <MenuItem component={Link} href={ROUTES.ACCOUNT.ROOT} onClick={() => handleNavClick(ROUTES.ACCOUNT.ROOT)}>
        <ListItemIcon>
          <Settings fontSize="medium" />
        </ListItemIcon>
        <ListItemText
          slotProps={{
            primary: { fontSize: '1rem' },
          }}
        >
          Settings
        </ListItemText>
      </MenuItem>

      {isAdmin && (
        <MenuItem component={Link} href={ROUTES.ADMIN.ROOT} onClick={() => handleNavClick(ROUTES.ADMIN.ROOT)}>
          <ListItemIcon>
            <Security fontSize="medium" />
          </ListItemIcon>
          <ListItemText
            slotProps={{
              primary: { fontSize: '1rem' },
            }}
          >
            Admin Portal
          </ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'));
          handleProfilesMenuClose();
        }}
      >
        <ListItemIcon>
          {themeMode === 'dark' ? <LightMode fontSize="medium" /> : <DarkMode fontSize="medium" />}
        </ListItemIcon>
        <ListItemText
          slotProps={{
            primary: { fontSize: '1rem' },
          }}
        >
          {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
        </ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem
        onClick={async () => {
          handleProfilesMenuClose();
          try {
            await apolloClient.clearStore();
          } catch {
            // Best-effort cache clear
          }
          try {
            await logoutUserAction();
          } catch (error) {
            // logoutUserAction may throw a NEXT_REDIRECT — that's expected
            if (error instanceof Error && (error as any).digest === 'NEXT_REDIRECT') {
              throw error;
            }
            // Log unexpected errors to aid debugging
            // eslint-disable-next-line no-console
            logger.error('Unexpected error during logoutUserAction', error);
          }
        }}
      >
        <ListItemIcon>
          <Logout fontSize="medium" />
        </ListItemIcon>
        <ListItemText
          slotProps={{
            primary: { fontSize: '1rem' },
          }}
        >
          Logout
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
