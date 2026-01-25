import { Container, Typography, Box, Button } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Groups, Add } from '@mui/icons-material';
import OrganizationsClient from '@/components/organization/organizationsPageClient';

export const metadata: Metadata = {
  title: 'Organizations · Ntlango',
};

// Enable ISR with 120-second revalidation (organizations change less frequently)
export const revalidate = 120;

export default async function OrganizationsPage() {
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
              Community spaces on Ntlango
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Discover and connect with creative collectives, event organizers, and community spaces. Join organizations
              to stay updated on their latest events and activities.
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
