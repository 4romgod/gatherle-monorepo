'use client';

import Link from 'next/link';
import { Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NAV_LINKS } from '@/lib/constants';

type Props = {
  variant?: 'toolbar' | 'drawer';
};

export default function NavLinksList({ variant = 'toolbar' }: Props) {
  if (variant === 'toolbar') {
    return (
      <>
        {NAV_LINKS.map((link) => (
          <Button
            key={link.label}
            component={Link}
            href={link.href}
            color="inherit"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': { color: 'text.primary', backgroundColor: 'transparent' },
            }}
          >
            {link.label}
          </Button>
        ))}
      </>
    );
  }

  // Events and Moments are already in the mobile bottom nav, so exclude them from the drawer to avoid duplication.
  const drawerLinks = NAV_LINKS.filter((link) => !['Events', 'Moments'].includes(link.label));

  return (
    <List>
      {drawerLinks.map((link) => (
        <Link key={link.label} href={link.href}>
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 2.25,
                gap: 1.5,
                minHeight: 56,
                px: 1,
                py: 1.35,
                '& .MuiListItemIcon-root': {
                  color: 'text.secondary',
                  minWidth: 30,
                },
                '& .MuiListItemText-primary': {
                  fontSize: '1rem',
                  fontWeight: 600,
                },
              }}
            >
              <ListItemIcon>
                <link.icon />
              </ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        </Link>
      ))}
    </List>
  );
}
