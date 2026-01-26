'use client';

import Link from 'next/link';
import React from 'react';
import { Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NAV_LINKS, ADMIN_NAV_LINK } from '@/lib/constants';
import { useIsAdmin } from '@/hooks';

type Props = {
  variant?: 'toolbar' | 'drawer';
};

export default function NavLinksList({ variant = 'toolbar' }: Props) {
  const isAdmin = useIsAdmin();
  const links = isAdmin ? [...NAV_LINKS, ADMIN_NAV_LINK] : NAV_LINKS;

  if (variant === 'toolbar') {
    return (
      <>
        {links.map((link) => (
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

  return (
    <List>
      {links.map((link) => (
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
    </List>
  );
}
