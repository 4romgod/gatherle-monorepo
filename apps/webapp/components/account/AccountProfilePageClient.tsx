'use client';

import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import type { User } from '@/data/graphql/types/graphql';
import AccountToolbarControls from '@/components/account/AccountToolbarControls';
import UserProfilePageClient from '@/components/users/UserProfilePageClient';
import type { ProfileEventsTabKey } from '@/components/users/ProfileEventsTabs';

type AccountProfilePageClientProps = {
  user: User;
};

export default function AccountProfilePageClient({ user }: AccountProfilePageClientProps) {
  const searchParams = useSearchParams();
  const requestedEventsTab = searchParams.get('eventsTab');
  const initialEventsTabKey: ProfileEventsTabKey | null =
    requestedEventsTab === 'going' ||
    requestedEventsTab === 'attended' ||
    requestedEventsTab === 'hosted' ||
    requestedEventsTab === 'saved'
      ? requestedEventsTab
      : null;

  return (
    <>
      <AccountToolbarControls user={user} />

      {user.username ? (
        <UserProfilePageClient
          eventsTabPersistenceKey="account-profile-events"
          hideOwnProfileActions
          initialEventsTabKey={initialEventsTabKey}
          username={user.username}
        />
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
