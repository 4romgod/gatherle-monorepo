import Link from 'next/link';
import { useState } from 'react';
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
} from '@mui/material';
import { Clear, Home, Login, Menu } from '@mui/icons-material';
import { useCustomAppContext } from '@/components/app-context';
import LoginModal from '@/components/modal/auth/login-modal';
import SignupModal from '@/components/modal/auth/signup-modal';

export default function TemporaryDrawer() {
  const { setIsAuthN } = useCustomAppContext();
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <ListItem>
        <ListItemButton>
          <Clear fontSize="large" />
        </ListItemButton>
      </ListItem>
      <List>
        <Link href={'/'}>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary={'Home'} />
            </ListItemButton>
          </ListItem>
        </Link>

        <LoginModal
          triggerButton={
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Login />
                </ListItemIcon>
                <ListItemText primary={'Log in'} />
              </ListItemButton>
            </ListItem>
          }
        />

        <Divider />

        <SignupModal
          triggerButton={
            <Button variant="contained" color="secondary" fullWidth>
              <ListItemText primary={'Sign up'} />
            </Button>
          }
        />
      </List>
    </Box>
  );

  return (
    <div>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        onClick={toggleDrawer(true)}
        edge="start"
        size="large"
        sx={{
          mr: 2,
          ml: 3,
          ...(open && { display: 'none' }),
        }}
      >
        <Menu color="primary" />
      </IconButton>
      <Drawer open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}
