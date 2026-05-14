import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

function MetricCard({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function AdminScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated } = useAppShell();
  const { categories } = useMobileHomeDiscovery(authToken);
  const organizationsQuery = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const usersQuery = useQuery(GetUsersDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { options: { pagination: { limit: 40 } } },
    ...getApolloAuthContext(authToken),
  });
  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="Admin" />
        <AuthPromptCard
          description="Sign in with an elevated account to review platform health and discovery inventory."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Admin tools require sign-in"
        />
      </PageContainer>
    );
  }

  if (
    organizationsQuery.loading &&
    usersQuery.loading &&
    venuesQuery.loading &&
    organizationsQuery.data == null &&
    usersQuery.data == null &&
    venuesQuery.data == null
  ) {
    return (
      <PageContainer>
        <PageHeading title="Admin" />
        <StateNotice message="Loading admin metrics..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading subtitle="A trimmed-down operations snapshot for the mobile shell." title="Admin" />

      <View style={styles.metricsGrid}>
        <MetricCard label="Categories" value={String(categories.length)} />
        <MetricCard label="Organizations" value={String(organizationsQuery.data?.readOrganizations.length ?? 0)} />
        <MetricCard label="Community" value={String(usersQuery.data?.readUsers.length ?? 0)} />
        <MetricCard label="Venues" value={String(venuesQuery.data?.readVenues.length ?? 0)} />
      </View>

      <StateNotice message="This first mobile admin pass is intentionally read-only. Moderation and mutation flows can layer on top of the same data surfaces next." />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
    width: '48.4%',
  },
  metricLabel: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  metricValue: {
    ...typography.displayBold,
    fontSize: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
