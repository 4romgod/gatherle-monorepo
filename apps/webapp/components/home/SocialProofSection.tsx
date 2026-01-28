'use client';

import { Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import CustomContainer from '@/components/core/layout/CustomContainer';

type CityCount = {
  city: string;
  count: number;
};

type SocialProofSectionProps = {
  topCities: CityCount[];
  totalEvents: number;
  totalRsvps: number;
  loading?: boolean;
};

export default function SocialProofSection({
  topCities,
  totalEvents,
  totalRsvps,
  loading = false,
}: SocialProofSectionProps) {
  const stats = [
    { label: 'Curated gatherings live this week', value: totalEvents },
    { label: 'Total RSVPs responded', value: totalRsvps },
    { label: 'Cities with hosts', value: topCities.length },
  ];

  return (
    <Box id="social-proof" component="section" sx={{ backgroundColor: 'background.default', py: { xs: 6, md: 10 } }}>
      <CustomContainer>
        <Stack spacing={4} alignItems="center" sx={{ textAlign: 'center' }}>
          <Box sx={{ maxWidth: 640 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
              Popular events and locations our community keeps returning to.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              See where people are gathering and which experiences keep filling up fast. Every name below is live,
              vetted, and filled with energy.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center" sx={{ mb: { xs: 0, md: 0 } }}>
            {stats.map((stat) => (
              <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    textAlign: 'center',
                    px: 2,
                    py: 3,
                  }}
                >
                  <CardContent>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={80} /> : stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </CustomContainer>
    </Box>
  );
}
