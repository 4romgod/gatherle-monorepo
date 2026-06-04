'use client';

import { useMemo } from 'react';
import { Box, Container, Grid, Stack } from '@mui/material';
import RecommendedSection from './RecommendedSection';
import TrendingEventsSection from './TrendingEventsSection';
import NearbyEventsSection from './NearbyEventsSection';
import UpcomingRsvpsSection from './UpcomingRsvpsSection';
import HomeSearchBar from './HomeSearchBar';
import HomeBrowseSection from './HomeBrowseSection';
import FollowedMomentsBar from '@/components/eventMoments/FollowedMomentsBar';
import ToolbarEventSearchAction from '@/components/navigation/ToolbarEventSearchAction';
import { useToolbarAction } from '@/hooks/useToolbarAction';

interface PersonalizedHomeProps {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export default function PersonalizedHome({ user }: PersonalizedHomeProps) {
  const toolbarAction = useMemo(
    () => <ToolbarEventSearchAction placeholder="Search events, categories, or locations..." />,
    [],
  );
  useToolbarAction(toolbarAction);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Moments strip — full-width, Instagram-style, just below the nav */}
      <FollowedMomentsBar />

      <Box sx={{ py: { xs: 2, md: 4 } }}>
        <Container maxWidth="md" sx={{ pb: 2 }}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <HomeSearchBar />
                </Box>
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
              <Grid size={{ xs: 12 }}>
                <HomeBrowseSection isAuthenticated />
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
