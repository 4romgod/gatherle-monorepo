import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { GetEventCategoriesDocument } from '@data/graphql/query/EventCategory/query';
import { GetEventsCountDocument } from '@data/graphql/query/Event/query';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { getApolloAuthContext } from '@/lib/auth';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { AdminDomainLinkCard } from '@/components/admin/AdminDomainLinkCard';

type AdminDomainKey =
  | 'AdminDevices'
  | 'AdminEvents'
  | 'AdminOrganizations'
  | 'AdminVenues'
  | 'AdminUsers'
  | 'AdminSupportRequests'
  | 'AdminCategories'
  | 'AdminCategoryGroups';

type AdminDomainLink = {
  description: string;
  icon: React.ComponentProps<typeof AdminDomainLinkCard>['icon'];
  label: string;
  route: AdminDomainKey;
  title: string;
};

const ADMIN_DOMAIN_LINKS: AdminDomainLink[] = [
  {
    description: 'Review native app installs and block or re-open them when needed.',
    icon: 'smartphone',
    label: 'Devices',
    route: 'AdminDevices',
    title: 'Devices',
  },
  {
    description: 'Review, moderate, and clean up event records.',
    icon: 'calendar',
    label: 'Events',
    route: 'AdminEvents',
    title: 'Events',
  },
  {
    description: 'Repair org metadata and memberships.',
    icon: 'briefcase',
    label: 'Organizations',
    route: 'AdminOrganizations',
    title: 'Organizations',
  },
  {
    description: 'Maintain location and ownership records.',
    icon: 'map-pin',
    label: 'Venues',
    route: 'AdminVenues',
    title: 'Venues',
  },
  {
    description: 'Manage roles and account access.',
    icon: 'users',
    label: 'Users',
    route: 'AdminUsers',
    title: 'Users',
  },
  {
    description: 'Review feedback, bug reports, and trust or safety escalations.',
    icon: 'life-buoy',
    label: 'Support',
    route: 'AdminSupportRequests',
    title: 'Support',
  },
  {
    description: 'Maintain event category metadata.',
    icon: 'tag',
    label: 'Categories',
    route: 'AdminCategories',
    title: 'Categories',
  },
  {
    description: 'Curate category groupings for discovery.',
    icon: 'layers',
    label: 'Groups',
    route: 'AdminCategoryGroups',
    title: 'Groups',
  },
];

export function AdminScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const {
    authToken,
    isAdmin,
    isAuthenticated,
    loading: adminAccessLoading,
    refetch: refetchAdminAccess,
  } = useAdminAccess();

  const skip = !isAuthenticated || !authToken || !isAdmin;

  const eventsCountQuery = useQuery(GetEventsCountDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    ...getApolloAuthContext(authToken ?? null),
  });
  const categoriesQuery = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    ...getApolloAuthContext(authToken ?? null),
  });
  const organizationsQuery = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    ...getApolloAuthContext(authToken ?? null),
  });
  const usersQuery = useQuery(GetUsersDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    ...getApolloAuthContext(authToken ?? null),
  });
  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    ...getApolloAuthContext(authToken ?? null),
  });

  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([
        refetchAdminAccess(),
        eventsCountQuery.refetch(),
        categoriesQuery.refetch(),
        organizationsQuery.refetch(),
        usersQuery.refetch(),
        venuesQuery.refetch(),
      ]);
    }, [categoriesQuery, eventsCountQuery, organizationsQuery, refetchAdminAccess, usersQuery, venuesQuery]),
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <AuthPromptCard
          description="Sign in with a Gatherle admin account to access platform operations and moderation tools."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Admin tools require sign-in"
        />
      </PageContainer>
    );
  }

  if (adminAccessLoading && !isAdmin) {
    return (
      <PageContainer>
        <StateNotice message="Checking your admin access..." />
      </PageContainer>
    );
  }

  if (!isAdmin || !authToken) {
    return (
      <PageContainer>
        <StateNotice message="Only Gatherle admins can access this portal." />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.section}>
        <SectionHeading title="Operations overview" />
        <View style={styles.metricsGrid}>
          <View style={styles.metricCell}>
            <AdminMetricCard label="Events" tone="accent" value={eventsCountQuery.data?.readEventsCount ?? '—'} />
          </View>
          <View style={styles.metricCell}>
            <AdminMetricCard label="Organizations" value={organizationsQuery.data?.readOrganizations.length ?? '—'} />
          </View>
          <View style={styles.metricCell}>
            <AdminMetricCard label="Venues" value={venuesQuery.data?.readVenues.length ?? '—'} />
          </View>
          <View style={styles.metricCell}>
            <AdminMetricCard label="Users" value={usersQuery.data?.readUsers.length ?? '—'} />
          </View>
          <View style={styles.metricCell}>
            <AdminMetricCard label="Categories" value={categoriesQuery.data?.readEventCategories.length ?? '—'} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Manage domains" />
        <View style={styles.linkList}>
          {ADMIN_DOMAIN_LINKS.map((link) => (
            <AdminDomainLinkCard
              key={link.route}
              description={link.description}
              icon={link.icon}
              onPress={() => navigation.navigate(link.route)}
              title={link.title}
            />
          ))}
        </View>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  linkList: {
    gap: 10,
  },
  metricCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  section: {
    gap: 12,
    marginBottom: 18,
  },
});
