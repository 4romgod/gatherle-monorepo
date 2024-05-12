'use client';

import IconButton from '@mui/material/IconButton';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from 'next/link';

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
        <IconButton size="large" aria-label="new mails" color="inherit">
          <MailIcon />
        </IconButton>
        <Link href="/messages">Messages</Link>
      </MenuItem>
      <MenuItem>
        <Link href="/notifications">
          <IconButton size="large" aria-label="new notifications" color="inherit">
            <NotificationsIcon />
          </IconButton>
        </Link>
      </MenuItem>
    </Menu>
  );
}
