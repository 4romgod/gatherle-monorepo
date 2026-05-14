import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { VenueListItem } from '@/components/venues/VenueListItem';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';

export function VenuesScreen() {
  const { authToken } = useAppShell();
  const { data, error, loading, refetch } = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');

  const venues = data?.readVenues ?? [];
  const filteredVenues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return venues;
    }

    return venues.filter((venue) =>
      [
        venue.name,
        venue.type,
        venue.address?.city,
        venue.address?.region,
        venue.address?.country,
        ...(venue.amenities ?? []),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, venues]);

  return (
    <PageContainer>
      <PageHeading
        subtitle="Browse place-based hosts, event-ready venues, and the locations powering the Gatherle map."
        title="Venues"
      />
      <SearchField onChangeText={setQuery} placeholder="Search venues" value={query} />

      {loading && filteredVenues.length === 0 ? (
        <StateNotice message="Loading venues..." />
      ) : error ? (
        <StateNotice actionLabel="Retry" message="We couldn’t load venues." onPressAction={() => void refetch()} />
      ) : filteredVenues.length > 0 ? (
        <View style={styles.list}>
          {filteredVenues.map((venue) => (
            <VenueListItem key={venue.venueId} venue={venue} />
          ))}
        </View>
      ) : (
        <StateNotice message="No venues matched your search." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});
