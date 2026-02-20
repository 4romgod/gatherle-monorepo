'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import CustomContainer from '@/components/core/layout/CustomContainer';
import { ROUTES } from '@/lib/constants';

export default function ValuePropositionSection() {
  return (
    <Box
      id="value-proposition"
      component="section"
      sx={{
        backgroundColor: 'background.default',
        py: { xs: 6, md: 10 },
      }}
    >
      <CustomContainer sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', md: '75%', lg: '50%' },
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }} mt={3}>
            Build, discover, and celebrate events with intention.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 3 }}>
            Gatherle surfaces meaningful gatherings, gives hosts polish in minutes, and keeps every RSVP in sync with
            the people who care about shows, meals, activations, and after-hours sessions.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            component={Link}
            href={ROUTES.AUTH.REGISTER}
            sx={{ borderRadius: 10, mt: 3 }}
          >
            Join Gatherle
          </Button>
        </Box>
      </CustomContainer>
    </Box>
  );
}
