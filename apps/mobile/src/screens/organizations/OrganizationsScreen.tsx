import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationListItem } from '@/components/organizations/OrganizationListItem';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';

export function OrganizationsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken } = useAppShell();
  const { data, error, loading, refetch } = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  const organizations = data?.readOrganizations ?? [];
  const filteredOrganizations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return organizations;
    }

    return organizations.filter((organization) =>
      [organization.name, organization.description, ...(organization.tags ?? [])]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [organizations, query]);

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <SearchField onChangeText={setQuery} placeholder="Search organizations" value={query} />

      {loading && filteredOrganizations.length === 0 ? (
        <View style={styles.list}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={50} />
        </View>
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load organizations."
          onPressAction={() => void refetch()}
        />
      ) : filteredOrganizations.length > 0 ? (
        <View style={styles.list}>
          {filteredOrganizations.map((organization) => (
            <OrganizationListItem
              key={organization.orgId}
              onPress={() =>
                navigation.navigate('OrganizationDetails', {
                  orgId: organization.orgId,
                  orgName: organization.name,
                })
              }
              organization={organization}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="No organizations matched your search." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});
