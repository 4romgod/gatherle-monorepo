'use client';

import { useMemo, useState } from 'react';
import { Box, Container, Grid, Typography, Button, Paper } from '@mui/material';
import { Add, Groups } from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { GetAllOrganizationsDocument } from '@/data/graphql/query';
import OrganizationCard from '@/components/organization/organizationBox';
import OrganizationBoxSkeleton from '@/components/organization/organizationBox/OrganizationBoxSkeleton';
import SearchBox from '@/components/search/SearchBox';

const SKELETON_COUNT = 8;

export default function OrganizationsClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, loading, error } = useQuery(GetAllOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const organizations = data?.readOrganizations ?? [];

  const searchItems = useMemo(
    () => Array.from(new Set(organizations.map((org) => org.name).filter(Boolean) as string[])),
    [organizations],
  );

  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((org) => {
      const name = (org.name ?? '').toLowerCase();
      const description = (org.description ?? '').toLowerCase();
      const tags = (org.tags ?? []).join(' ').toLowerCase();
      return name.includes(q) || description.includes(q) || tags.includes(q);
    });
  }, [organizations, searchQuery]);

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box mb={5}>
        <SearchBox
          itemList={searchItems}
          placeholder="Try a name, description, or tag"
          ariaLabel="Search organizations"
          onSearch={setSearchQuery}
        />
      </Box>

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
      ) : filteredOrganizations.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Groups sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
            {searchQuery ? 'No matching organizations' : 'No organizations yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Try a different search term.' : 'Be the first to create a community space on Gatherle'}
          </Typography>
          {!searchQuery && (
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
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredOrganizations.map((organization) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={organization.slug}>
              <OrganizationCard organization={organization} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
