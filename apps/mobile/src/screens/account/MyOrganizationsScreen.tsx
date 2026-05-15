import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationListItem } from '@/components/organizations/OrganizationListItem';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
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
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
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
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {loading && memberships.length === 0 ? (
        <View style={styles.list}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
        </View>
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
              <OrganizationListItem
                onPress={() =>
                  navigation.navigate('OrganizationDetails', {
                    orgId: membership.organization.orgId,
                    orgName: membership.organization.name,
                  })
                }
                organization={membership.organization}
              />
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
