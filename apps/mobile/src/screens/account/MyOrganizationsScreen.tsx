import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationListItem } from '@/components/organizations/OrganizationListItem';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

export function MyOrganizationsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const { data, error, loading, refetch } = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="My organizations" />
        <AuthPromptCard
          description="Sign in to manage organizations you own or help run."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Organization management starts after sign-in"
        />
      </PageContainer>
    );
  }

  const memberships = data?.readMyOrganizations ?? [];

  return (
    <PageContainer>
      <PageHeading subtitle="Everything you host or help operate on Gatherle lives here." title="My organizations" />

      {loading && memberships.length === 0 ? (
        <StateNotice message="Loading your organizations..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your organizations."
          onPressAction={() => void refetch()}
        />
      ) : memberships.length > 0 ? (
        <View style={styles.list}>
          {memberships.map((membership) => (
            <View key={`${membership.organization.orgId}-${membership.role}`} style={styles.membershipCard}>
              <OrganizationListItem organization={membership.organization} />
              <Text style={[styles.roleText, { color: theme.colors.primary }]}>{membership.role}</Text>
            </View>
          ))}
        </View>
      ) : (
        <StateNotice message="You are not part of any organizations yet." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  membershipCard: {
    gap: 8,
  },
  roleText: {
    ...typography.bodySemiBold,
    fontSize: 12,
    marginLeft: 8,
  },
});
