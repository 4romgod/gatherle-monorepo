import { Container, Typography, Box, Button } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import { Groups, Add } from '@mui/icons-material';
import OrganizationsClient from '@/components/organization/organizationsPageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Organizations Hosting Events',
  description:
    'Discover organizations, collectives, and communities creating events on Gatherle and follow their latest activity.',
  keywords: ['organizations', 'event organizers', 'community groups', 'collectives'],
});

// Enable ISR with 120-second revalidation (organizations change less frequently)
export const revalidate = 120;

export default async function OrganizationsPage() {
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
              <Groups sx={{ fontSize: 20 }} />
              ORGANIZATIONS
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
              Community spaces on Gatherle
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Discover and connect with creative collectives, event organizers, and community spaces. Join organizations
              to stay updated on their latest events and activities.
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
                href={ROUTES.ACCOUNT.ORGANIZATIONS.CREATE}
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
                Create Organization
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Organizations Grid */}
      <OrganizationsClient />
    </Box>
  );
}
