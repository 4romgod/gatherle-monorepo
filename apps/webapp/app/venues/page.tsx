import { Box } from '@mui/material';
import VenuesClient from '@/components/venue/VenuesClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Event Venues',
  description:
    'Explore event venues across the network, compare amenities, and find the right space for your next gathering.',
  keywords: ['event venues', 'venue discovery', 'spaces for events', 'venue listings'],
});

// Enable ISR with 120-second revalidation (venues change less frequently)
export const revalidate = 120;

export default function VenuesPage() {
  return (
    <Box>
      <VenuesClient />
    </Box>
  );
}
