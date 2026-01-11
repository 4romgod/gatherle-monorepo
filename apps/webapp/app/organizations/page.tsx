import { Container, Typography, Box, Button, Grid } from '@mui/material';
import React from 'react';
import { getClient } from '@/data/graphql';
import { GetAllOrganizationsDocument } from '@/data/graphql/query';
import OrganizationCard from '@/components/organization/card';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Groups, Add } from '@mui/icons-material';

type OrganizationSummary = {
  orgId: string;
  slug?: string;
  name?: string;
  description?: string;
  logo?: string;
  tags?: string[];
  followersCount?: number;
  isFollowable?: boolean;
};

type OrganizationsResponse = {
  readOrganizations: OrganizationSummary[] | null;
};

export const metadata: Metadata = {
  title: 'Organizations · Ntlango',
};

// Enable ISR with 120-second revalidation (organizations change less frequently)
export const revalidate = 120;

export default async function OrganizationsPage() {
  const { data } = await getClient().query<OrganizationsResponse>({
    query: GetAllOrganizationsDocument,
  });
  const organizations = data.readOrganizations ?? [];

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
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}
            >
              Discover and connect with creative collectives, event organizers, and community spaces. Join organizations to stay updated on their latest events and activities.
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
      <Container sx={{ py: 6 }}>
        {organizations.length > 0 ? (
          <Grid container spacing={3}>
            {organizations.map(organization => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={organization.orgId}>
                <OrganizationCard {...organization} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
            }}
          >
            <Groups sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No organizations yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to create a community space on Ntlango
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
              Create Organization
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
