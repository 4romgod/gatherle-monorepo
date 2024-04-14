'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import MoreIcon from '@mui/icons-material/MoreVert';
import SearchInput from '@/components/search/search-box';
import Link from 'next/link';
import ToggleThemeMode, {
  ToggleThemeModeProps,
} from '../theme/toggle-theme-mode';

/**
 * Inspired by: https://arshadalisoomro.hashnode.dev/creating-a-navigation-bar-with-mui-appbar-component-in-nextjs
 */
export default function PrimaryNavBar({
  setThemeMode,
  themeMode,
}: ToggleThemeModeProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const desktopMenuId = 'account-menu';
  const renderDesktopMenu = () => (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={desktopMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
          <AccountCircle fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
          <Settings fontSize="small" />
        </ListItemIcon>
        Settings
      </MenuItem>
      <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
          <Logout fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  const mobileMenuId = 'account-menu-mobile';
  const renderMobileMenu = () => (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem>
        <IconButton size="large" aria-label="new mails" color="inherit">
          <MailIcon />
        </IconButton>
        <p>Messages</p>
      </MenuItem>
      <MenuItem>
        <IconButton size="large" aria-label="new notifications" color="inherit">
          <NotificationsIcon />
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            color={'secondary'}
            sx={{
              mx: 2,
              display: { md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              textDecoration: 'none',
            }}
          >
            <Link href={'/'}>Ntlango</Link>
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <SearchInput sx={{ display: { xs: 'none', md: 'flex' } }} />

          <ToggleThemeMode setThemeMode={setThemeMode} themeMode={themeMode} />

          <Box sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}>
            <IconButton size="large" aria-label="mails" color="primary">
              <MailIcon />
            </IconButton>
            <IconButton size="large" aria-label="notifications" color="primary">
              <NotificationsIcon />
            </IconButton>
          </Box>

          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls={desktopMenuId}
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="primary"
            sx={{ mr: 1 }}
          >
            <Avatar color={'primary'} sx={{ width: 32, height: 32 }}>
              A
            </Avatar>
          </IconButton>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="primary"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderDesktopMenu()}
      {renderMobileMenu()}
    </Box>
  );
}
