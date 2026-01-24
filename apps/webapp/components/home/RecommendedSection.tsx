'use client';
import { Box, Typography, Card, CardContent, Skeleton, Avatar, Stack } from '@mui/material';
import OrganizationCard from '@/components/organization/organizationBox';
import { useQuery } from '@apollo/client';
import { GetAllOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { GetAllUsersDocument } from '@/data/graphql/query/User/query';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import OrganizationBoxSkeleton from '../organization/organizationBox/OrganizationBoxSkeleton';

export default function RecommendedSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // TODO Fetch organizations and users (could be improved with a recommendation engine)
  const { data: orgData, loading: orgLoading } = useQuery(GetAllOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    context: { headers: getAuthHeader(token) },
  });
  const { data: userData, loading: userLoading } = useQuery(GetAllUsersDocument, {
    fetchPolicy: 'cache-and-network',
    context: { headers: getAuthHeader(token) },
  });

  const orgs = orgData?.readOrganizations?.slice(0, 2) ?? [];
  const users = userData?.readUsers?.slice(0, 1) ?? [];
  const loading = orgLoading || userLoading;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: { xs: 1, md: 2 }, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
      >
        Recommended For You
      </Typography>
      {loading ? (
        <Stack direction="row" spacing={{ xs: 1.5, md: 2 }} sx={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {[1, 2, 3].map((i) => (
            <OrganizationBoxSkeleton key={i} />
          ))}
        </Stack>
      ) : orgs.length + users.length === 0 ? (
        <Typography color="text.secondary">
          No recommendations yet. Follow more people and organizations to get personalized suggestions!
        </Typography>
      ) : (
        <Stack direction="row" spacing={{ xs: 1.5, md: 2 }} sx={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {orgs.map((org) => (
            <Box key={org.orgId} sx={{ width: { xs: 220, md: 260 }, minWidth: { xs: 180, md: 220 }, flex: '0 0 auto' }}>
              <OrganizationCard
                name={org.name}
                slug={org.slug}
                description={org.description}
                logo={org.logo}
                tags={org.tags}
                followersCount={org.followersCount}
                isFollowable={org.isFollowable}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
