import { useCallback, useMemo } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SortOrderInput } from '@data/graphql/types/graphql';
import { GetVenueByIdDocument } from '@data/graphql/query/Venue/query';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { InlineButton } from '@/components/core/InlineButton';
import { PageContainer } from '@/components/core/PageContainer';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { DetailSection } from '@/components/details/DetailSection';
import { DetailStatChip } from '@/components/details/DetailStatChip';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { EventTileGridSkeleton } from '@/components/skeleton/EventTileGridSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { usePublicEvents } from '@/hooks/events/usePublicEvents';
import { getApolloAuthContext } from '@/lib/auth';
import { openLocationQueryInMaps } from '@/lib/events/deviceActions';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type VenueDetailsRoute = RouteProp<RootStackParamList, 'VenueDetails'>;

export function VenueDetailsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<VenueDetailsRoute>();
  const { authToken } = useAppShell();
  const { theme } = useAppTheme();
  const { venueId } = route.params;
  const { data, error, loading, refetch } = useQuery(GetVenueByIdDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { venueId },
    ...getApolloAuthContext(authToken),
  });
  const venue = data?.readVenueById ?? null;
  const {
    error: eventsError,
    loading: eventsLoading,
    occurrences,
    refetch: refetchEvents,
  } = usePublicEvents(
    {
      filters: [{ field: 'venueId', value: venueId }],
      pagination: { limit: 12 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    },
    authToken,
  );
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchEvents()]);
    }, [refetch, refetchEvents]),
  );

  const venueLocation = useMemo(
    () =>
      [venue?.name, venue?.address?.street, venue?.address?.city, venue?.address?.region, venue?.address?.country]
        .filter(Boolean)
        .join(', '),
    [venue],
  );
  const amenityList = useMemo(() => venue?.amenities?.filter(Boolean) ?? [], [venue?.amenities]);

  const handleOpenWebsite = () => {
    if (!venue?.url) {
      return;
    }

    void Linking.openURL(venue.url);
  };

  const handleOpenDirections = () => {
    if (!venueLocation) {
      return;
    }

    void openLocationQueryInMaps(venueLocation);
  };

  if (loading && !venue) {
    return (
      <PageContainer>
        <View style={styles.loadingGroup}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={72} showTrailing trailingWidth={72} />
          <StateNotice message="Loading venue..." />
        </View>
      </PageContainer>
    );
  }

  if ((error && !venue) || !venue) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice actionLabel="Retry" message="We couldn’t load this venue." onPressAction={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          {venue.featuredImageUrl ? (
            <Image source={{ uri: venue.featuredImageUrl }} style={styles.heroImage} />
          ) : (
            <ProfileAvatar label={venue.name} size={74} />
          )}

          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{venue.name}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{venue.type || 'Venue'}</Text>
            <Text numberOfLines={3} style={[styles.description, { color: theme.colors.textSecondary }]}>
              {venueLocation || 'Address details are still being updated for this venue.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <InlineButton compact label="Directions" onPress={handleOpenDirections} tone="primary" />
          {venue.url ? <InlineButton compact label="Website" onPress={handleOpenWebsite} tone="neutral" /> : null}
        </View>
      </View>

      <View style={styles.statRow}>
        <DetailStatChip label="Type" value={venue.type || 'Venue'} />
        <DetailStatChip label="Capacity" value={venue.capacity ? String(venue.capacity) : 'Unknown'} />
        <DetailStatChip label="Amenities" value={String(amenityList.length)} />
      </View>

      {amenityList.length > 0 ? (
        <DetailSection title="Amenities">
          <View style={styles.pillWrap}>
            {amenityList.map((amenity) => (
              <View
                key={amenity}
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.metaPillText, { color: theme.colors.textPrimary }]}>{amenity}</Text>
              </View>
            ))}
          </View>
        </DetailSection>
      ) : null}

      <DetailSection title="Events at this venue">
        {eventsLoading && occurrences.length === 0 ? (
          <EventTileGridSkeleton count={6} />
        ) : eventsError ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load venue events."
            onPressAction={() => void refetchEvents()}
          />
        ) : occurrences.length > 0 ? (
          <EventTileGrid
            occurrences={occurrences}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
          />
        ) : (
          <StateNotice message="No published events are linked to this venue right now." />
        )}
      </DetailSection>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroImage: {
    borderRadius: 18,
    height: 74,
    width: 74,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  loadingGroup: {
    gap: 18,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subtitle: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  title: {
    ...typography.displayBold,
    fontSize: 24,
    letterSpacing: -0.7,
  },
});
