import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { QueryOptionsInput } from '@data/graphql/types/graphql';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import { CommunityMemberRow } from '@/components/community/CommunityMemberRow';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';

const communityOptions: QueryOptionsInput = {
  pagination: {
    limit: 40,
  },
};

export function CommunityScreen() {
  const { authToken } = useAppShell();
  const { data, error, loading, refetch } = useQuery(GetUsersDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options: communityOptions,
    },
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');

  const users = data?.readUsers ?? [];
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [
        user.username,
        user.bio,
        user.given_name,
        user.family_name,
        user.location?.city,
        user.location?.state,
        user.location?.country,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  return (
    <PageContainer>
      <PageHeading
        subtitle="Discover people attending, hosting, and shaping the same circles you care about on Gatherle."
        title="Community"
      />
      <SearchField onChangeText={setQuery} placeholder="Search people" value={query} />

      {loading && filteredUsers.length === 0 ? (
        <StateNotice message="Loading the community..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load community members."
          onPressAction={() => void refetch()}
        />
      ) : filteredUsers.length > 0 ? (
        <View style={styles.list}>
          {filteredUsers.map((user) => (
            <CommunityMemberRow key={user.userId} primaryActionLabel="View" user={user} />
          ))}
        </View>
      ) : (
        <StateNotice message="No community members matched your search." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});
