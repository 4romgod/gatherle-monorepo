'use client';

import Link from 'next/link';
import { AutoAwesome, Business, Groups, LocationOn, LockOutlined } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';

type HomeBrowseSectionProps = {
  isAuthenticated: boolean;
};

const browseItems = [
  {
    href: ROUTES.CATEGORIES.ROOT,
    icon: <AutoAwesome sx={{ fontSize: 22 }} />,
    label: 'Categories',
  },
  {
    href: ROUTES.ORGANIZATIONS.ROOT,
    icon: <Business sx={{ fontSize: 22 }} />,
    label: 'Organizations',
  },
  {
    href: ROUTES.VENUES.ROOT,
    icon: <LocationOn sx={{ fontSize: 22 }} />,
    label: 'Venues',
  },
  {
    href: ROUTES.USERS.ROOT,
    icon: <Groups sx={{ fontSize: 22 }} />,
    label: 'People',
  },
] as const;

export default function HomeBrowseSection({ isAuthenticated }: HomeBrowseSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ letterSpacing: '0.04em' }}>
          Explore more
        </Typography>
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1.25}>
        {browseItems.map((item) => {
          const showAuthBadge = item.label === 'People' && !isAuthenticated;

          return (
            <Button
              key={item.label}
              component={Link}
              href={item.href}
              startIcon={item.icon}
              endIcon={showAuthBadge ? <LockOutlined sx={{ fontSize: '1rem !important', opacity: 0.8 }} /> : undefined}
              sx={{
                alignItems: 'center',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 999,
                color: 'text.primary',
                fontWeight: 700,
                gap: 0.75,
                justifyContent: 'flex-start',
                minHeight: 44,
                px: 1.75,
                py: 1,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'text.disabled',
                },
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );
}
