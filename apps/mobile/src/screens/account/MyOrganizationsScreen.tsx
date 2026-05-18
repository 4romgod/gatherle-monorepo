import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useCallback, useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { OrganizationRole } from '@data/graphql/types/graphql';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationListItem } from '@/components/organizations/OrganizationListItem';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';

export function MyOrganizationsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { theme } = useAppTheme();
  const { authToken, isAuthenticated } = useAppShell();
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
  const formatRoleLabel = (role: string) =>
    role
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const canEditOrganization = (role: OrganizationRole) =>
    role === OrganizationRole.Owner || role === OrganizationRole.Admin;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Create organization"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CreateOrganization')}
          style={({ pressed }) => [
            styles.headerAction,
            {
              opacity: pressed ? 0.64 : 1,
            },
          ]}
        >
          <Feather color={theme.colors.primary} name="plus-circle" size={20} />
        </Pressable>
      ),
    });
  }, [navigation, theme.colors.primary]);

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
            <OrganizationListItem
              key={`${membership.organization.orgId}-${membership.role}`}
              onPress={() =>
                navigation.navigate('OrganizationDetails', {
                  orgId: membership.organization.orgId,
                  orgName: membership.organization.name,
                })
              }
              organization={membership.organization}
              trailingActionLabel={canEditOrganization(membership.role) ? 'Edit' : undefined}
              trailingActionOnPress={
                canEditOrganization(membership.role)
                  ? () =>
                      navigation.navigate('EditOrganization', {
                        orgId: membership.organization.orgId,
                        orgName: membership.organization.name ?? undefined,
                      })
                  : undefined
              }
              trailingBadgeLabel={formatRoleLabel(membership.role)}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="You are not part of any organizations yet." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
  },
  list: {
    gap: 8,
  },
});
