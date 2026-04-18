'use client';

import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import RecommendedSection from './RecommendedSection';
import TrendingEventsSection from './TrendingEventsSection';
import NearbyEventsSection from './NearbyEventsSection';
import UpcomingRsvpsSection from './UpcomingRsvpsSection';
import HomeSearchBar from './HomeSearchBar';
import FollowedMomentsBar from '@/components/eventMoments/FollowedMomentsBar';

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
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Moments strip — full-width, Instagram-style, just below the nav */}
      <FollowedMomentsBar />

      <Box sx={{ py: { xs: 2, md: 4 } }}>
        <Container maxWidth="md" sx={{ pb: 2 }}>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid size={{ xs: 12 }}>
              <HomeSearchBar />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <UpcomingRsvpsSection />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <RecommendedSection />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <NearbyEventsSection />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TrendingEventsSection />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
