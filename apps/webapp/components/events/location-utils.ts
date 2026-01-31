import { Location } from '@/data/graphql/types/graphql';

const buildGoogleMapsDirectionsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const buildGoogleMapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const formatLocationText = (location: Location): string => {
  if (location.locationType === 'venue') {
    return [
      location.address?.street,
      location.address?.city,
      location.address?.state,
      location.address?.zipCode,
      location.address?.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  if (location.locationType === 'online') {
    return 'This event will be held online.';
  }

  if (location.locationType === 'tba') {
    return 'The location will be announced soon.';
  }

  return '';
};

export const formatAddressForSearch = (location: Location): string | null => {
  if (!location.address) {
    return null;
  }

  const addressParts = [
    location.address.street,
    location.address.city,
    location.address.state,
    location.address.zipCode,
    location.address.country,
  ].filter(Boolean);

  return addressParts.length ? addressParts.join(', ') : null;
};

export const getLocationNavigationUrl = (location: Location): string | null => {
  if (location.coordinates) {
    return buildGoogleMapsDirectionsUrl(location.coordinates.latitude, location.coordinates.longitude);
  }

  const addressSearch = formatAddressForSearch(location);
  if (addressSearch) {
    return buildGoogleMapsSearchUrl(addressSearch);
  }

  return null;
};
