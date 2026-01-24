'use client';

import { useQuery } from '@apollo/client';
import { Grid, Container, Typography, Box, Button } from '@mui/material';
import { LocationOn, Add } from '@mui/icons-material';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import VenueCard from '@/components/venue/card';
import VenueCardSkeleton from '@/components/venue/VenueCardSkeleton';

export default function VenuesClient() {
  const { data, loading, error } = useQuery(GetAllVenuesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const venues = data?.readVenues ?? [];

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Unable to load venues right now.
      </Typography>
    );
  }

  if (loading && venues.length === 0) {
    return (
      <Container sx={{ py: 6 }}>
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`venue-skeleton-${index}`}>
              <VenueCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (venues.length === 0) {
    return (
      <Container sx={{ py: 6 }}>
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
      </Container>
    );
  }

  return (
    <Container sx={{ py: 6 }}>
      <Grid container spacing={3}>
        {venues.map((venue) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={venue.venueId}>
            <VenueCard {...venue} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
