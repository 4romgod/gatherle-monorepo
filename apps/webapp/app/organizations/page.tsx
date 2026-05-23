import { Box } from '@mui/material';
import { APP_NAME } from '@/lib/constants';
import OrganizationsClient from '@/components/organization/organizationsPageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Organizations Hosting Events',
  description: `Discover organizations, collectives, and communities creating events on ${APP_NAME} and follow their latest activity.`,
  keywords: ['organizations', 'event organizers', 'community groups', 'collectives'],
});

// Enable ISR with 120-second revalidation (organizations change less frequently)
export const revalidate = 120;

export default async function OrganizationsPage() {
  return (
    <Box>
      <OrganizationsClient />
    </Box>
  );
}
