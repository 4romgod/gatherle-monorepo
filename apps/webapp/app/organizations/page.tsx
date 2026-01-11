import { Container, Typography, Box, Button } from '@mui/material';
import React from 'react';
import { getClient } from '@/data/graphql';
import { GetAllOrganizationsDocument } from '@/data/graphql/query';
import OrganizationCard from '@/components/organization/card';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';

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
    <Container>
      <Box sx={{ mt: 6, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Built for creators
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            Community spaces on Ntlango
          </Typography>
        </Box>
        <Box>
          <Button component={Link} href={ROUTES.EVENTS.ROOT} variant="outlined" size="small">
            Browse events
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 3,
        }}
      >
        {organizations.map(organization => (
          <Box key={organization.orgId}>
            <OrganizationCard {...organization} />
          </Box>
        ))}
        {organizations.length === 0 && (
          <Box>
            <Typography variant="body1" color="text.secondary">
              No organizations have been published yet.
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
