import { logger } from './logger';

/**
 * Geocoding utilities using OpenStreetMap Nominatim API.
 *
 * IMPORTANT: Rate Limiting Requirements
 * =====================================
 * Nominatim has a strict usage policy: MAX 1 request per second.
 * See: https://operations.osmfoundation.org/policies/nominatim/
 *
 * These utilities do NOT implement internal rate limiting. Callers are
 * responsible for enforcing rate limits when:
 * - Processing multiple addresses in a loop
 * - Handling bulk event creation/updates
 * - Running migration scripts
 *
 * Note: geocodeAddress() uses progressive fallback and may make up to 3
 * requests per call (full address → city+state+country → city+country).
 * Account for this when calculating delays between calls.
 *
 * Example rate-limited usage:
 * ```typescript
 * const DELAY_MS = 1100; // 1.1s minimum between request starts
 * for (const event of events) {
 *   const start = Date.now();
 *   await enrichLocationWithCoordinates(event.location);
 *   const elapsed = Date.now() - start;
 *   if (elapsed < DELAY_MS) await sleep(DELAY_MS - elapsed);
 * }
 * ```
 */

// Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const NOMINATIM_USER_AGENT = 'Gatherle-EventsAPI/1.0 (info@mapapa.co.za)';
const RATE_LIMIT_DELAY_MS = 1100;
let lastGeocodeRequestAt = 0;

const waitForRateLimit = async () => {
  const now = Date.now();
  const nextAllowed = lastGeocodeRequestAt + RATE_LIMIT_DELAY_MS;
  if (now < nextAllowed) {
    await new Promise((resolve) => setTimeout(resolve, nextAllowed - now));
  }
  lastGeocodeRequestAt = Date.now();
};

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Builds URL search params for Nominatim structured query.
 */
const buildGeocodingParams = (address: Address): URLSearchParams => {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
  });

  const { street, city, state, zipCode, country } = address;
  if (street) params.append('street', street);
  if (city) params.append('city', city);
  if (state) params.append('state', state);
  if (zipCode) params.append('postalcode', zipCode);
  if (country) params.append('country', country);

  return params;
};

/**
 * Makes a single geocoding request to Nominatim.
 */
async function makeGeocodingRequest(params: URLSearchParams): Promise<GeocodingResult | null> {
  const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await waitForRateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        logger.warn(`[geocodeAddress] Geocoding API returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const { lat, lon } = data[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        logger.warn(`[geocodeAddress] Invalid coordinates returned: lat=${lat}, lon=${lon}`);
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      if (attempt === 2) {
        logger.warn('[geocodeAddress] Request failed after retry:', { error });
        return null;
      }
      logger.debug('[geocodeAddress] Request failed, retrying shortly', { attempt, error });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return null;
}

/**
 * Geocodes an address to coordinates using OpenStreetMap Nominatim API.
 * Free tier, no API key required.
 *
 * Uses progressive fallback: tries full address first, then city+state+country,
 * then just city+country if the street address is not found.
 *
 * @warning This function may make up to 3 HTTP requests (progressive fallback).
 * Nominatim requires max 1 request/second. Callers must implement rate limiting
 * when calling this function in loops or bulk operations.
 *
 * @param address - The address to geocode
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodeAddress(address: Address): Promise<GeocodingResult | null> {
  const { street, city, state, zipCode, country } = address;

  const addressParts = [street, city, state, zipCode, country].filter(Boolean);
  if (addressParts.length === 0) {
    logger.debug('[geocodeAddress] No address parts provided, skipping geocoding');
    return null;
  }

  const addressString = addressParts.join(', ');

  try {
    // Strategy 1: Try full address with street
    if (street) {
      const fullParams = buildGeocodingParams(address);
      logger.debug(`[geocodeAddress] Trying full address: ${addressString}`);
      const result = await makeGeocodingRequest(fullParams);
      if (result) {
        logger.debug(`[geocodeAddress] Successfully geocoded full address to: ${result.latitude}, ${result.longitude}`);
        return result;
      }
      logger.debug('[geocodeAddress] Full address not found, trying without street...');
    }

    // Strategy 2: Try city + state + country (without street/zip)
    if (city && country) {
      const cityParams = new URLSearchParams({ format: 'json', limit: '1' });
      cityParams.append('city', city);
      if (state) cityParams.append('state', state);
      cityParams.append('country', country);

      const cityStateString = [city, state, country].filter(Boolean).join(', ');
      logger.debug(`[geocodeAddress] Trying city-level: ${cityStateString}`);
      const result = await makeGeocodingRequest(cityParams);
      if (result) {
        logger.debug(`[geocodeAddress] Successfully geocoded city to: ${result.latitude}, ${result.longitude}`);
        return result;
      }
    }

    // Strategy 3: Try just city + country (fallback for when state is wrong)
    if (city && country && state) {
      const minimalParams = new URLSearchParams({ format: 'json', limit: '1' });
      minimalParams.append('city', city);
      minimalParams.append('country', country);

      logger.debug(`[geocodeAddress] Trying minimal: ${city}, ${country}`);
      const result = await makeGeocodingRequest(minimalParams);
      if (result) {
        logger.debug(`[geocodeAddress] Successfully geocoded minimal to: ${result.latitude}, ${result.longitude}`);
        return result;
      }
    }

    logger.debug(`[geocodeAddress] No results found for: ${addressString}`);
    return null;
  } catch (error) {
    logger.error('[geocodeAddress] Error geocoding address:', { error });
    return null;
  }
}

/**
 * Checks if a location object has valid coordinates.
 */
const hasValidCoordinates = (location: Record<string, any>): boolean =>
  Boolean(location.coordinates?.latitude && location.coordinates?.longitude);

/**
 * Enriches a location object with coordinates if it has an address but no coordinates.
 * Mutates the input location object.
 *
 * @warning Calls geocodeAddress() internally, which may make up to 3 HTTP requests.
 * Nominatim requires max 1 request/second. Callers must implement rate limiting
 * when calling this function in loops or bulk operations.
 *
 * @param location - Event location object (may be modified)
 * @returns The same location object, potentially with coordinates added
 */
export async function enrichLocationWithCoordinates(
  location: Record<string, any> | undefined | null,
): Promise<Record<string, any> | undefined | null> {
  if (!location) {
    return location;
  }

  // Skip if location type is not 'venue' (online/tba events don't need geocoding)
  if (location.locationType !== 'venue') {
    logger.debug('[enrichLocationWithCoordinates] Skipping non-venue location');
    return location;
  }

  // Skip if coordinates already exist
  if (hasValidCoordinates(location)) {
    logger.debug('[enrichLocationWithCoordinates] Coordinates already exist, skipping geocoding');
    return location;
  }

  // Check if address exists
  const { address } = location;
  if (!address) {
    logger.debug('[enrichLocationWithCoordinates] No address found, skipping geocoding');
    return location;
  }

  // Geocode the address
  const coords = await geocodeAddress({
    street: address.street,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
  });

  if (coords) {
    location.coordinates = coords;
    logger.info(`[enrichLocationWithCoordinates] Added coordinates: ${coords.latitude}, ${coords.longitude}`);
  }

  return location;
}
