'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Divider, ListItemIcon, ListItemText } from '@mui/material';
import { AccountCircle, Logout, Settings, Business } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import NProgress from 'nprogress';

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
      <Link href={ROUTES.ACCOUNT.PROFILE} onClick={() => handleNavClick(ROUTES.ACCOUNT.PROFILE)}>
        <MenuItem>
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
      </Link>
      <Link href={ROUTES.ACCOUNT.ORGANIZATIONS.ROOT} onClick={() => handleNavClick(ROUTES.ACCOUNT.ORGANIZATIONS.ROOT)}>
        <MenuItem>
          <ListItemIcon>
            <Business fontSize="medium" />
          </ListItemIcon>
          <ListItemText
            slotProps={{
              primary: { fontSize: '1rem' },
            }}
          >
            Organizations
          </ListItemText>
        </MenuItem>
      </Link>
      <Link href={ROUTES.ACCOUNT.ROOT} onClick={() => handleNavClick(ROUTES.ACCOUNT.ROOT)}>
        <MenuItem>
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
      </Link>
      <Divider />
      <MenuItem
        onClick={() => {
          logoutUserAction();
          handleProfilesMenuClose();
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
