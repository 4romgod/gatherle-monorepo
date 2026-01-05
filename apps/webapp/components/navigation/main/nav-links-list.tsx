'use client';

import Link from 'next/link';
import React from 'react';
import { Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NAV_LINKS } from '@/components/navigation/main/nav-constants';

type Props = {
  variant?: 'toolbar' | 'drawer';
};

export default function NavLinksList({ variant = 'toolbar' }: Props) {
  if (variant === 'toolbar') {
    return (
      <>
        {NAV_LINKS.map(link => (
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
      {NAV_LINKS.map(link => (
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
