'use client';

import Link from 'next/link';
import IconButton from '@mui/material/IconButton';
import { Mail, Notifications } from '@mui/icons-material';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

type NotificationsMenuProps = {
  NotificationsMenuAnchorEl: HTMLElement | null;
  NotificationsMenuId: string;
  handleNotificationsMenuClose: () => void;
  isNotificationsMenuOpen: boolean;
};

export default function NotificationsMenu({
  NotificationsMenuAnchorEl,
  NotificationsMenuId,
  handleNotificationsMenuClose,
  isNotificationsMenuOpen,
}: NotificationsMenuProps) {
  return (
    <Menu
      anchorEl={NotificationsMenuAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={NotificationsMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isNotificationsMenuOpen}
      onClose={handleNotificationsMenuClose}
    >
      <MenuItem>
        <Link href="/messages">
          <IconButton size="large" aria-label="new mails" color="inherit">
            <Mail />
          </IconButton>
          Messages
        </Link>
      </MenuItem>
      <MenuItem>
        <Link href="/notifications">
          <IconButton size="large" aria-label="new notifications" color="inherit">
            <Notifications />
          </IconButton>
          Notifications
        </Link>
      </MenuItem>
    </Menu>
  );
}
