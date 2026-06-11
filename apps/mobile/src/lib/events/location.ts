import type { GetVenuesQuery } from '@data/graphql/types/graphql';

type VenueOption = GetVenuesQuery['readVenues'][number];

type AddressLike = {
  city?: string | null;
  country?: string | null;
  state?: string | null;
  street?: string | null;
  zipCode?: string | null;
};

type VenueAddressLike = {
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  region?: string | null;
  street?: string | null;
};

type EventLocationLike = {
  address?: AddressLike | null;
  details?: string | null;
  locationType?: string | null;
};

export type MobileEventLocationType = 'venue' | 'online' | 'tba';

export type MobileEventLocationFormFields = {
  city: string;
  country: string;
  locationDetails: string;
  locationType: MobileEventLocationType;
  postalCode: string;
  state: string;
  venueId: string;
};

export const MOBILE_EVENT_LOCATION_OPTIONS: readonly MobileEventLocationType[] = ['venue', 'online', 'tba'];

export const MOBILE_EVENT_LOCATION_LABELS: Record<MobileEventLocationType, string> = {
  online: 'Online',
  tba: 'TBA',
  venue: 'Venue',
};

export const MOBILE_EVENT_LOCATION_FALLBACKS = {
  online: 'Online',
  tba: 'Location to be announced',
} as const;

function getStateLike(address?: AddressLike | VenueAddressLike | null) {
  if (!address) {
    return '';
  }

  if ('region' in address) {
    return address.region ?? '';
  }

  return (address as AddressLike).state ?? '';
}

function joinLocationParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

export function normalizeMobileEventLocationType(location?: EventLocationLike | null): MobileEventLocationType {
  if (location?.locationType === 'online' || location?.locationType === 'tba' || location?.locationType === 'venue') {
    return location.locationType;
  }

  return location?.address ? 'venue' : 'tba';
}

export function buildLocationSummaryFromAddress(address?: AddressLike | VenueAddressLike | null) {
  return joinLocationParts([address?.city, getStateLike(address), address?.country]);
}

export function hasUsableVenueAddress(location?: EventLocationLike | null) {
  return (
    normalizeMobileEventLocationType(location) === 'venue' &&
    Boolean(buildLocationSummaryFromAddress(location?.address))
  );
}

export function formatMobileLocationLabel(location?: EventLocationLike | null) {
  const normalizedType = normalizeMobileEventLocationType(location);

  if (normalizedType === 'online') {
    return location?.details?.trim() || MOBILE_EVENT_LOCATION_FALLBACKS.online;
  }

  if (normalizedType === 'tba') {
    return location?.details?.trim() || MOBILE_EVENT_LOCATION_FALLBACKS.tba;
  }

  return (
    buildLocationSummaryFromAddress(location?.address) ||
    location?.details?.trim() ||
    MOBILE_EVENT_LOCATION_FALLBACKS.tba
  );
}

export function formatVenueSummary(venue?: VenueOption | null) {
  if (!venue) {
    return '';
  }

  return joinLocationParts([venue.address?.street, venue.address?.city, venue.address?.region, venue.address?.country]);
}

export function validateMobileEventLocation(fields: MobileEventLocationFormFields) {
  if (fields.locationType !== 'venue' || fields.venueId.trim()) {
    return null;
  }

  if (!fields.city.trim() || !fields.state.trim() || !fields.country.trim() || !fields.postalCode.trim()) {
    return 'Please choose a venue or complete the custom address fields.';
  }

  return null;
}

export function buildMobileEventLocationPayload(
  fields: MobileEventLocationFormFields,
  selectedVenue?: VenueOption | null,
) {
  const trimmedDetails = fields.locationDetails.trim();

  if (fields.locationType === 'online' || fields.locationType === 'tba') {
    const locationSnapshot =
      trimmedDetails ||
      (fields.locationType === 'online' ? MOBILE_EVENT_LOCATION_FALLBACKS.online : MOBILE_EVENT_LOCATION_FALLBACKS.tba);

    return {
      location: {
        details: trimmedDetails || undefined,
        locationType: fields.locationType,
      },
      locationSnapshot,
      venueId: undefined,
    };
  }

  const address = selectedVenue
    ? {
        city: selectedVenue.address?.city ?? fields.city.trim(),
        country: selectedVenue.address?.country ?? fields.country.trim(),
        state: selectedVenue.address?.region ?? fields.state.trim(),
        street: selectedVenue.address?.street ?? undefined,
        zipCode: selectedVenue.address?.postalCode ?? fields.postalCode.trim(),
      }
    : {
        city: fields.city.trim(),
        country: fields.country.trim(),
        state: fields.state.trim(),
        zipCode: fields.postalCode.trim(),
      };

  const locationDetails = trimmedDetails || selectedVenue?.name?.trim() || undefined;
  const coordinates =
    typeof selectedVenue?.geo?.latitude === 'number' && typeof selectedVenue?.geo?.longitude === 'number'
      ? {
          latitude: selectedVenue.geo.latitude,
          longitude: selectedVenue.geo.longitude,
        }
      : undefined;

  return {
    location: {
      address,
      coordinates,
      details: locationDetails,
      locationType: 'venue' as const,
    },
    locationSnapshot:
      buildLocationSummaryFromAddress(address) || locationDetails || MOBILE_EVENT_LOCATION_FALLBACKS.tba,
    venueId: selectedVenue?.venueId,
  };
}
