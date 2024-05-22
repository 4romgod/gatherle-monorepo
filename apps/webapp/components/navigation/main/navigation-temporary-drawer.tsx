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
import { useRouter } from 'next/navigation';

export default function TemporaryDrawer() {
  const router = useRouter();
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

        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <Login />
            </ListItemIcon>
            <ListItemText onClick={() => router.push('/auth/login')} primary={'Log in'} />
          </ListItemButton>
        </ListItem>

        <Divider />

        <Button variant="contained" color="secondary" fullWidth>
          <ListItemText onClick={() => router.push('/auth/register')} primary={'Sign up'} />
        </Button>
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
