import { geocodeAddress, enrichLocationWithCoordinates } from '@/utils/geocode';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('geocodeAddress', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return null when no address parts provided', async () => {
    const result = await geocodeAddress({});
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should geocode a complete address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '51.5074', lon: '-0.1278' }],
    });

    const result = await geocodeAddress({
      street: '10 Downing Street',
      city: 'London',
      state: 'England',
      zipCode: 'SW1A 2AA',
      country: 'United Kingdom',
    });

    expect(result).toEqual({ latitude: 51.5074, longitude: -0.1278 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org'),
      expect.objectContaining({
        headers: {
          'User-Agent': 'Gatherle-EventsAPI/1.0 (info@mapapa.co.za)',
          'Accept-Language': 'en',
        },
      }),
    );
  });

  it('should geocode with partial address (city and country)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '40.7128', lon: '-74.0060' }],
    });

    const result = await geocodeAddress({ city: 'New York', country: 'USA' });

    expect(result).toEqual({ latitude: 40.7128, longitude: -74.006 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should return null when only city is provided (no country)', async () => {
    const result = await geocodeAddress({ city: 'New York' });

    // Without country, the city-level strategies are skipped
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return null when API returns no results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await geocodeAddress({ city: 'NonexistentCity12345' });

    expect(result).toBeNull();
  });

  it('should return null when API returns error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const result = await geocodeAddress({ city: 'London' });

    expect(result).toBeNull();
  });

  it('should return null when fetch throws an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await geocodeAddress({ city: 'London', country: 'UK' });

    expect(result).toBeNull();
  });

  it('should return null when API returns invalid coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: 'invalid', lon: 'coords' }],
    });

    const result = await geocodeAddress({ city: 'London', country: 'United Kingdom' });

    expect(result).toBeNull();
  });
});

describe('enrichLocationWithCoordinates', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return null/undefined as-is', async () => {
    expect(await enrichLocationWithCoordinates(null)).toBeNull();
    expect(await enrichLocationWithCoordinates(undefined)).toBeUndefined();
  });

  it('should skip non-venue locations', async () => {
    const location = { locationType: 'online', address: { city: 'London' } };
    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location);
    expect(result?.coordinates).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should skip if coordinates already exist', async () => {
    const location = {
      locationType: 'venue',
      address: { city: 'London', state: 'England', country: 'UK', zipCode: '' },
      coordinates: { latitude: 51.5, longitude: -0.1 },
    };
    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location);
    expect(result?.coordinates).toEqual({ latitude: 51.5, longitude: -0.1 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should skip if no address exists', async () => {
    const location = { locationType: 'venue' };
    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location);
    expect(result?.coordinates).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should add coordinates when address exists but no coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '51.5074', lon: '-0.1278' }],
    });

    const location = {
      locationType: 'venue',
      address: {
        street: '10 Downing Street',
        city: 'London',
        state: 'England',
        zipCode: 'SW1A 2AA',
        country: 'United Kingdom',
      },
    };

    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location); // Same object reference (mutated)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // The mock returns 51.5074, -0.1278 so expect those coordinates
    expect(result?.coordinates).toEqual({ latitude: 51.5074, longitude: -0.1278 });
  });

  it('should not add coordinates if geocoding fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const location = {
      locationType: 'venue',
      address: { city: 'UnknownCity' },
    };

    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location);
    expect(result?.coordinates).toBeUndefined();
  });

  it('should handle TBA location type', async () => {
    const location = { locationType: 'tba' };
    const result = await enrichLocationWithCoordinates(location);

    expect(result).toBe(location);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
