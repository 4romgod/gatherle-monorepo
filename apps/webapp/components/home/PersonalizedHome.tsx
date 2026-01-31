'use client';

import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import TrendingEventsSection from './TrendingEventsSection';
import NearbyEventsSection from './NearbyEventsSection';
import RecommendedSection from './RecommendedSection';
import UpcomingRsvpsSection from './UpcomingRsvpsSection';
import HomeSearchBar from './HomeSearchBar';

interface PersonalizedHomeProps {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export default function PersonalizedHome({ user }: PersonalizedHomeProps) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="md" sx={{ pb: 2 }}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: { xs: 1, md: 0 } }}
              >
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <HomeSearchBar />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <UpcomingRsvpsSection />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TrendingEventsSection />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <NearbyEventsSection />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <RecommendedSection />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
