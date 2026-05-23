import { Box } from '@mui/material';
import UsersPageClient from '@/components/users/UsersPageClient';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Community Members',
  description: `Discover people in the ${APP_NAME} community, follow profiles, and connect through shared interests.`,
  keywords: ['community', 'user profiles', 'follow creators', 'event community'],
});

export const revalidate = 120;

export default async function Page() {
  return (
    <Box>
      <UsersPageClient />
    </Box>
  );
}
