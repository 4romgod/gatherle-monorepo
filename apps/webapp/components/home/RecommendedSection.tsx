'use client';
import { Box, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import { GetAllOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { GetAllUsersDocument } from '@/data/graphql/query/User/query';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import OrganizationCard from '@/components/organization/organizationBox';
import OrganizationBoxSkeleton from '../organization/organizationBox/OrganizationBoxSkeleton';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';

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
        <CarouselSkeleton
          itemCount={3}
          viewAll={false}
          itemWidth={280}
          renderSkeletonItem={() => <OrganizationBoxSkeleton />}
        />
      ) : orgs.length + users.length === 0 ? (
        <Typography color="text.secondary">
          No recommendations yet. Follow more people and organizations to get personalized suggestions!
        </Typography>
      ) : (
        <Carousel
          items={orgs}
          itemKey={(org) => org.orgId}
          renderItem={(org) => <OrganizationCard organization={org} />}
          showIndicators={false}
        />
      )}
    </Box>
  );
}
