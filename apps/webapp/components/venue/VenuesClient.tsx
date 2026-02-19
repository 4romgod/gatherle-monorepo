'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Grid, Container, Typography, Box, Button, Paper } from '@mui/material';
import { LocationOn, Add } from '@mui/icons-material';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import VenueCard from '@/components/venue/VenueCard';
import VenueCardSkeleton from '@/components/venue/VenueCardSkeleton';
import SearchBox from '@/components/search/SearchBox';

export default function VenuesClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, loading, error } = useQuery(GetAllVenuesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const venues = data?.readVenues ?? [];

  const searchItems = useMemo(
    () => Array.from(new Set(venues.map((v) => v.name).filter(Boolean) as string[])),
    [venues],
  );

  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues;
    const q = searchQuery.toLowerCase();
    return venues.filter((venue) => {
      const name = (venue.name ?? '').toLowerCase();
      const type = (venue.type ?? '').toLowerCase();
      const city = (venue.address?.city ?? '').toLowerCase();
      const region = (venue.address?.region ?? '').toLowerCase();
      const country = (venue.address?.country ?? '').toLowerCase();
      return name.includes(q) || type.includes(q) || city.includes(q) || region.includes(q) || country.includes(q);
    });
  }, [venues, searchQuery]);

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Unable to load venues right now.
      </Typography>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box mb={5}>
        <SearchBox
          itemList={searchItems}
          placeholder="Try a name, city, or venue type"
          ariaLabel="Search venues"
          onSearch={setSearchQuery}
        />
      </Box>

      {loading && venues.length === 0 ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`venue-skeleton-${index}`}>
              <VenueCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : filteredVenues.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <LocationOn sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
            {searchQuery ? 'No matching venues' : 'No venues yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Try a different search term.' : 'Be the first to add a venue to the network'}
          </Typography>
          {!searchQuery && (
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
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredVenues.map((venue) => (
            <Grid size={{ xs: 12, sm: 6 }} key={venue.venueId}>
              <VenueCard {...venue} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
