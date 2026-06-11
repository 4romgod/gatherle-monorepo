import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GetVenuesQuery } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { SelectionControl } from '@/components/core/SelectionControl';
import {
  formatVenueSummary,
  MOBILE_EVENT_LOCATION_LABELS,
  MOBILE_EVENT_LOCATION_OPTIONS,
  type MobileEventLocationType,
} from '@/lib/events/location';

type VenueOption = GetVenuesQuery['readVenues'][number];

type EventLocationEditorProps = {
  city: string;
  country: string;
  locationDetails: string;
  locationType: MobileEventLocationType;
  onChangeCity: (value: string) => void;
  onChangeCountry: (value: string) => void;
  onChangeLocationDetails: (value: string) => void;
  onChangeLocationType: (value: MobileEventLocationType) => void;
  onChangePostalCode: (value: string) => void;
  onChangeState: (value: string) => void;
  onChangeVenueId: (value: string) => void;
  onPressCreateVenue?: () => void;
  postalCode: string;
  state: string;
  venueId: string;
  venues: VenueOption[];
};

export function EventLocationEditor({
  city,
  country,
  locationDetails,
  locationType,
  onChangeCity,
  onChangeCountry,
  onChangeLocationDetails,
  onChangeLocationType,
  onChangePostalCode,
  onChangeState,
  onChangeVenueId,
  onPressCreateVenue,
  postalCode,
  state,
  venueId,
  venues,
}: EventLocationEditorProps) {
  const { theme } = useAppTheme();

  const selectedVenue = useMemo(() => venues.find((venue) => venue.venueId === venueId) ?? null, [venueId, venues]);
  const venueSuggestions = useMemo(() => {
    const nextSuggestions = venues.slice(0, 6);

    if (!selectedVenue || nextSuggestions.some((venue) => venue.venueId === selectedVenue.venueId)) {
      return nextSuggestions;
    }

    return [selectedVenue, ...nextSuggestions].slice(0, 7);
  }, [selectedVenue, venues]);

  const locationDetailLabel =
    locationType === 'online'
      ? 'Online location details'
      : locationType === 'tba'
        ? 'Location note (optional)'
        : 'Venue details (optional)';

  return (
    <View style={styles.root}>
      <View style={styles.choiceBlock}>
        <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Location type</Text>
        <View style={styles.stack}>
          {MOBILE_EVENT_LOCATION_OPTIONS.map((option) => (
            <SelectionControl
              key={option}
              description={
                option === 'venue'
                  ? 'Use a physical venue or enter an address.'
                  : option === 'online'
                    ? 'Share a link, platform, or room details.'
                    : 'Tell attendees that the location is still to be announced.'
              }
              kind="radio"
              label={MOBILE_EVENT_LOCATION_LABELS[option]}
              onPress={() => onChangeLocationType(option)}
              selected={locationType === option}
            />
          ))}
        </View>
      </View>

      {locationType === 'venue' ? (
        <>
          <View style={styles.choiceBlock}>
            <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Venue</Text>
            <View style={styles.choiceWrap}>
              <AccountChoiceChip label="Custom address" onPress={() => onChangeVenueId('')} selected={!venueId} />
              {venueSuggestions.map((venue) => (
                <AccountChoiceChip
                  key={venue.venueId}
                  label={venue.name}
                  onPress={() => onChangeVenueId(venue.venueId)}
                  selected={venueId === venue.venueId}
                />
              ))}
            </View>
          </View>

          {onPressCreateVenue ? (
            <Pressable
              onPress={onPressCreateVenue}
              style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.72 : 1 }]}
            >
              <Text style={[styles.linkButtonText, { color: theme.colors.primary }]}>Need a new venue? Create one</Text>
            </Pressable>
          ) : null}

          {selectedVenue ? (
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {formatVenueSummary(selectedVenue) || selectedVenue.name}
            </Text>
          ) : (
            <>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Enter the address if the venue is not in Gatherle yet.
              </Text>
              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <AccountTextField label="City" onChangeText={onChangeCity} placeholder="Johannesburg" value={city} />
                </View>
                <View style={styles.fieldHalf}>
                  <AccountTextField label="State" onChangeText={onChangeState} placeholder="Gauteng" value={state} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <AccountTextField
                    label="Country"
                    onChangeText={onChangeCountry}
                    placeholder="South Africa"
                    value={country}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <AccountTextField
                    keyboardType="phone-pad"
                    label="Postal code"
                    onChangeText={onChangePostalCode}
                    placeholder="2000"
                    value={postalCode}
                  />
                </View>
              </View>
            </>
          )}

          <AccountTextField
            label={locationDetailLabel}
            multiline
            onChangeText={onChangeLocationDetails}
            placeholder="Building, room, landmark, or host notes"
            value={locationDetails}
          />
        </>
      ) : (
        <>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            {locationType === 'online'
              ? 'Add the platform, link, or room info attendees should use.'
              : 'Share a short note if you already know how you will announce the location.'}
          </Text>
          <AccountTextField
            label={locationDetailLabel}
            multiline
            onChangeText={onChangeLocationDetails}
            placeholder={locationType === 'online' ? 'Zoom, Google Meet, livestream link…' : 'Details coming soon…'}
            value={locationDetails}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  choiceBlock: {
    gap: 10,
  },
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  root: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  stack: {
    gap: 8,
  },
});
