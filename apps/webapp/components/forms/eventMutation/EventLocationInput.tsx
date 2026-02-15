'use client';

import Link from 'next/link';
import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Autocomplete, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import { GetVenuesQuery, Location } from '@/data/graphql/types/graphql';
import { LocationInputProps, ROUTES } from '@/lib/constants';
import LocationTypeRadioButtons from '@/components/buttons/LocationTypeRadioButton';

type VenueOption = GetVenuesQuery['readVenues'][number];

const formatVenueLabel = (venue: VenueOption) => {
  const region = venue.address?.region;
  const city = venue.address?.city;
  const locationSegment = [region, city].filter(Boolean).join(', ');
  return locationSegment ? `${venue.name} • ${locationSegment}` : venue.name;
};

const buildLocationFromVenue = (venue: VenueOption): Location => {
  const address =
    venue.address && venue.address.city && venue.address.country
      ? {
          city: venue.address.city,
          country: venue.address.country,
          state: venue.address.region ?? '', // always string
          zipCode: venue.address.postalCode ?? '', // always string
          street: venue.address.street ?? undefined,
        }
      : undefined;

  const coordinates =
    venue.geo && typeof venue.geo.latitude === 'number' && typeof venue.geo.longitude === 'number'
      ? {
          latitude: venue.geo.latitude,
          longitude: venue.geo.longitude,
        }
      : undefined;

  return {
    locationType: 'venue',
    address,
    coordinates,
  };
};

const buildDefaultLocation = (type: Location['locationType']): Location =>
  type === 'venue' ? { locationType: 'venue' } : { locationType: type, details: '' };

export default function EventLocationInput({ onChange, value, venueId, onVenueChange }: LocationInputProps) {
  const { data, loading } = useQuery(GetAllVenuesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const venues = data?.readVenues ?? [];
  const currentLocation = value ?? ({ locationType: 'venue' } as Location);
  const selectedVenue = useMemo(() => venues.find((venue) => venue.venueId === venueId) ?? null, [venues, venueId]);

  const handleLocationTypeChange = useCallback(
    (type: string) => {
      const locationType = type as Location['locationType'];
      onChange(buildDefaultLocation(locationType));
      if (locationType !== 'venue') {
        onVenueChange?.(undefined);
      }
    },
    [onChange, onVenueChange],
  );

  const handleVenueChange = useCallback(
    (_: React.SyntheticEvent, option: VenueOption | null) => {
      if (option) {
        onChange(buildLocationFromVenue(option));
        onVenueChange?.(option.venueId);
        return;
      }
      onChange(buildDefaultLocation('venue'));
      onVenueChange?.(undefined);
    },
    [onChange, onVenueChange],
  );

  const handleDetailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...currentLocation,
        details: event.target.value,
      });
    },
    [currentLocation, onChange],
  );

  const detailLabel =
    currentLocation.locationType === 'online'
      ? 'Online location (link, platform, or room info)'
      : 'Additional details (optional)';

  return (
    <Stack spacing={2}>
      <LocationTypeRadioButtons selectedType={currentLocation.locationType} onChange={handleLocationTypeChange} />

      {currentLocation.locationType === 'venue' ? (
        <Stack spacing={1.5}>
          <Autocomplete
            value={selectedVenue}
            options={venues}
            loading={loading}
            getOptionLabel={formatVenueLabel}
            isOptionEqualToValue={(option, value) => option.venueId === value?.venueId}
            onChange={handleVenueChange}
            noOptionsText="No venues found"
            disableClearable={false}
            clearOnEscape
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a venue"
                placeholder={loading ? 'Loading venues…' : 'Search by name or city'}
                size="small"
                color="secondary"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
          />

          {selectedVenue && (
            <Typography variant="body2" color="text.secondary">
              {selectedVenue.address?.street ? `${selectedVenue.address.street}, ` : ''}
              {selectedVenue.address?.city ?? selectedVenue.name}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Need a new venue?
            </Typography>
            <Button
              component={Link}
              href={ROUTES.VENUES.ADD}
              variant="text"
              startIcon={<Add />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Add venue
            </Button>
          </Stack>
        </Stack>
      ) : (
        <TextField
          label={detailLabel}
          value={currentLocation.details ?? ''}
          onChange={handleDetailChange}
          size="small"
          color="secondary"
          multiline
          rows={currentLocation.locationType === 'online' ? 2 : 1}
          fullWidth
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      )}
    </Stack>
  );
}
