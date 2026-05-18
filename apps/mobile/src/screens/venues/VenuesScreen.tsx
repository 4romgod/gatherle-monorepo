import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { VenueListItem } from '@/components/venues/VenueListItem';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';

export function VenuesScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken } = useAppShell();
  const { theme } = useAppTheme();
  const { data, error, loading, refetch } = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const [query, setQuery] = useState('');
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Create venue"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CreateVenue')}
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
      <SearchField onChangeText={setQuery} placeholder="Search venues" value={query} />

      {loading && filteredVenues.length === 0 ? (
        <View style={styles.list}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={66} showTrailing trailingWidth={54} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={66} showTrailing trailingWidth={54} />
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={66} showTrailing trailingWidth={54} />
        </View>
      ) : error ? (
        <StateNotice actionLabel="Retry" message="We couldn’t load venues." onPressAction={() => void refetch()} />
      ) : filteredVenues.length > 0 ? (
        <View style={styles.list}>
          {filteredVenues.map((venue) => (
            <VenueListItem
              key={venue.venueId}
              onPress={() =>
                navigation.navigate('VenueDetails', {
                  venueId: venue.venueId,
                  venueName: venue.name,
                })
              }
              venue={venue}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="No venues matched your search." />
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
