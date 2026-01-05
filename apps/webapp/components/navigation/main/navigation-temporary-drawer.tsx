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
import { Clear, Home, Login, Menu, Event, Business, Place, People, ControlPointOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function TemporaryDrawer({ isAuthN }: { isAuthN: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const navLinks = [
    { label: 'Events', href: ROUTES.EVENTS.ROOT, icon: Event },
    { label: 'Organizations', href: ROUTES.ORGANIZATIONS.ROOT, icon: Business },
    { label: 'Venues', href: ROUTES.VENUES.ROOT, icon: Place },
    { label: 'Community', href: ROUTES.USERS.ROOT, icon: People },
  ];

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <ListItem>
        <ListItemButton>
          <Clear fontSize="large" />
        </ListItemButton>
      </ListItem>
      <List>
        <Link href={ROUTES.ROOT}>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary={'Home'} />
            </ListItemButton>
          </ListItem>
        </Link>

        <Divider sx={{ my: 1 }} />

        {navLinks.map(link => (
          <Link key={link.label} href={link.href}>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <link.icon />
                </ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItemButton>
            </ListItem>
          </Link>
        ))}

        <Divider sx={{ my: 1 }} />

        {!isAuthN && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => router.push(ROUTES.AUTH.LOGIN)}>
                <ListItemIcon>
                  <Login />
                </ListItemIcon>
                <ListItemText primary={'Log in'} />
              </ListItemButton>
            </ListItem>

            <Box sx={{ px: 2, pt: 1 }}>
              <Button variant="contained" color="secondary" fullWidth onClick={() => router.push(ROUTES.AUTH.REGISTER)}>
                Join Ntlango
              </Button>
            </Box>
          </>
        )}

        {isAuthN && (
          <Box sx={{ px: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<ControlPointOutlined />}
              onClick={() => router.push(ROUTES.ACCOUNT.EVENTS.CREATE)}
            >
              Host an event
            </Button>
          </Box>
        )}
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
