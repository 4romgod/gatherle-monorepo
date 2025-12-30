'use client';

import Link from 'next/link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Divider, ListItemIcon, ListItemText } from '@mui/material';
import { AccountCircle, Logout, Settings } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';
import { logoutUserAction } from '@/data/actions/server/auth/logout';

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
      <Link href={ROUTES.ACCOUNT.PROFILE} onClick={handleProfilesMenuClose}>
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
      <Link href={ROUTES.ACCOUNT.ROOT} onClick={handleProfilesMenuClose}>
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
