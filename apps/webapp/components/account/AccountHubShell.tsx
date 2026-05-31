'use client';

import type { ReactNode } from 'react';
import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import { WEB_RADIUS } from '@/lib/constants/radius';
import AccountToolbarControls, { type AccountToolbarUser } from '@/components/account/AccountToolbarControls';

type AccountHubShellProps = {
  children: ReactNode;
  user: AccountToolbarUser;
};

export default function AccountHubShell({ children, user }: AccountHubShellProps) {
  const displayName = [user.given_name, user.family_name].filter(Boolean).join(' ') || 'Account';
  const avatarSrc = user.profile_picture ?? undefined;

  return (
    <>
      <AccountToolbarControls user={user} />

      <Stack spacing={{ xs: 0, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: { xs: 0, md: WEB_RADIUS.panel },
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 2.75, md: 3.5 },
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 2 }} alignItems={{ sm: 'center' }}>
              <Avatar
                src={avatarSrc}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  height: 72,
                  width: 72,
                }}
              >
                {displayName[0] ?? user.username?.[0] ?? 'A'}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ display: 'block', fontWeight: 800, letterSpacing: '0.1em', mb: 0.75 }}
                >
                  Account
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontSize: { xs: '1.625rem', md: '2rem' },
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.05,
                    mb: 0.75,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
                  {user.username ? `@${user.username}` : 'Complete your profile to personalize your public account.'}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Manage your profile, hosting, organizations, and preferences from one place.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        <Box>{children}</Box>
      </Stack>
    </>
  );
}
