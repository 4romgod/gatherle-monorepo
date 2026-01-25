'use client';

import { Box, Container, Grid, Typography, Button } from '@mui/material';
import { Add, Groups } from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { GetAllOrganizationsDocument } from '@/data/graphql/query';
import OrganizationCard from '@/components/organization/organizationBox';
import OrganizationBoxSkeleton from '@/components/organization/organizationBox/OrganizationBoxSkeleton';

const SKELETON_COUNT = 8;

export default function OrganizationsClient() {
  const { data, loading, error } = useQuery(GetAllOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const organizations = data?.readOrganizations ?? [];

  return (
    <Container sx={{ py: 6 }}>
      {error ? (
        <Typography color="error" sx={{ textAlign: 'center' }}>
          Unable to load organizations right now. Please try again shortly.
        </Typography>
      ) : loading && organizations.length === 0 ? (
        <Grid container spacing={3}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`skeleton-${index}`}>
              <OrganizationBoxSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : organizations.length === 0 ? (
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
      ) : (
        <Grid container spacing={3}>
          {organizations.map((organization) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={organization.orgId}>
              <OrganizationCard {...organization} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
