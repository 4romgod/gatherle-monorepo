import { Container, Typography, Box, Button, Grid } from '@mui/material';
import Link from 'next/link';
import React from 'react';
import { getClient } from '@/data/graphql';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import VenueCard from '@/components/venue/card';
import { ROUTES } from '@/lib/constants';
import type { Metadata } from 'next';
import { LocationOn, Add } from '@mui/icons-material';

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
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container>
          <Box sx={{ maxWidth: '800px' }}>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <LocationOn sx={{ fontSize: 20 }} />
              VENUES
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' },
                lineHeight: 1.2,
              }}
            >
              Discover event spaces
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}
            >
              Explore venues across the network. From intimate studios to grand concert halls, find the perfect space for your next event or discover where your favorite events happen.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                component={Link}
                href={ROUTES.EVENTS.ROOT}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  fontSize: '1rem',
                }}
              >
                Browse Events
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Add />}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  borderWidth: 2,
                  fontSize: '1rem',
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Add Venue
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Venues Grid */}
      <Container sx={{ py: 6 }}>
        {venues.length > 0 ? (
          <Grid container spacing={3}>
            {venues.map(venue => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={venue.venueId}>
                <VenueCard {...venue} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
            }}
          >
            <LocationOn sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No venues yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to add a venue to the network
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
              }}
            >
              Add Venue
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
