import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationListItem } from '@/components/organizations/OrganizationListItem';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';

export function OrganizationsScreen() {
  const { authToken } = useAppShell();
  const { data, error, loading, refetch } = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');

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
    <PageContainer>
      <PageHeading
        subtitle="Browse host communities, clubs, and collectives shaping local experiences on Gatherle."
        title="Organizations"
      />
      <SearchField onChangeText={setQuery} placeholder="Search organizations" value={query} />

      {loading && filteredOrganizations.length === 0 ? (
        <StateNotice message="Loading organizations..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load organizations."
          onPressAction={() => void refetch()}
        />
      ) : filteredOrganizations.length > 0 ? (
        <View style={styles.list}>
          {filteredOrganizations.map((organization) => (
            <OrganizationListItem key={organization.orgId} organization={organization} />
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
