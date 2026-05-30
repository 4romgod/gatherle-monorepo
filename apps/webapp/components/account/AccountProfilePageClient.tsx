'use client';

import { Box, Typography } from '@mui/material';
import type { User } from '@/data/graphql/types/graphql';
import AccountToolbarControls from '@/components/account/AccountToolbarControls';
import UserProfilePageClient from '@/components/users/UserProfilePageClient';

type AccountProfilePageClientProps = {
  user: User;
};

export default function AccountProfilePageClient({ user }: AccountProfilePageClientProps) {
  return (
    <>
      <AccountToolbarControls user={user} />

      {user.username ? (
        <UserProfilePageClient hideOwnProfileActions username={user.username} />
      ) : (
        <Box sx={{ minHeight: '100vh', px: 2, py: 4 }}>
          <Typography color="text.secondary">
            Finish your profile setup in Settings to unlock the full account surface.
          </Typography>
        </Box>
      )}
    </>
  );
}
