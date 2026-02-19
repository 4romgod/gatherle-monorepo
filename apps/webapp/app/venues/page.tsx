import { Container, Typography, Box, Button } from '@mui/material';
import { LocationOn, Add } from '@mui/icons-material';
import VenuesClient from '@/components/venue/VenuesClient';
import { ROUTES } from '@/lib/constants';
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
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="md">
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
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Explore venues across the network. From intimate studios to grand concert halls, find the perfect space
              for your next event or discover where your favorite events happen.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
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
                href={ROUTES.VENUES.ADD}
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
      <VenuesClient />
    </Box>
  );
}
