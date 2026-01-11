import { Container, Typography, Box, Button } from '@mui/material';
import Link from 'next/link';
import React from 'react';
import { getClient } from '@/data/graphql';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import VenueCard from '@/components/venue/card';
import { ROUTES } from '@/lib/constants';
import type { Metadata } from 'next';

type VenueSummary = {
  venueId: string;
  name?: string;
  type?: string;
  capacity?: number;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  amenities?: string[];
};

type VenuesResponse = {
  readVenues: VenueSummary[] | null;
};

export const metadata: Metadata = {
  title: 'Venues · Ntlango',
};

// Enable ISR with 120-second revalidation (venues change less frequently)
export const revalidate = 120;

export default async function VenuesPage() {
  const { data } = await getClient().query<VenuesResponse>({
    query: GetAllVenuesDocument,
  });
  const venues = data.readVenues ?? [];

  return (
    <Container>
      <Box sx={{ mt: 6, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Spaces across the network
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            Venues on Ntlango
          </Typography>
        </Box>
        <Box>
          <Button component={Link} href={ROUTES.EVENTS.ROOT} variant="outlined" size="small">
            All events
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 3,
        }}
      >
        {venues.map(venue => (
          <Box key={venue.venueId}>
            <VenueCard {...venue} />
          </Box>
        ))}
        {venues.length === 0 && (
          <Box>
            <Typography variant="body1" color="text.secondary">
              No venues have been published yet.
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
