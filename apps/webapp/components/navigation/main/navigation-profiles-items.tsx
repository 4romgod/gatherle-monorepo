'use client';

import Link from 'next/link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Divider, ListItemIcon, ListItemText, ListItem } from '@mui/material';
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
        vertical: 'top',
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
    >
      <MenuItem onClick={handleProfilesMenuClose}>
        <Link href={ROUTES.ACCOUNT.PROFILE}>
          <ListItem>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </ListItem>
        </Link>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleProfilesMenuClose}>
        <Link href={ROUTES.ACCOUNT.ROOT}>
          <ListItem>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </ListItem>
        </Link>
      </MenuItem>
      <MenuItem
        onClick={() => {
          logoutUserAction();
          handleProfilesMenuClose();
        }}
      >
        <ListItem>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </ListItem>
      </MenuItem>
    </Menu>
  );
}
