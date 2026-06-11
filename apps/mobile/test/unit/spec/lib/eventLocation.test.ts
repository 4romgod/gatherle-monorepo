import {
  buildLocationSummaryFromAddress,
  buildMobileEventLocationPayload,
  formatMobileLocationLabel,
  hasUsableVenueAddress,
  normalizeMobileEventLocationType,
  validateMobileEventLocation,
} from '@/lib/events/location';

describe('mobile event location helpers', () => {
  it('normalizes legacy physical locations into the shared venue type', () => {
    expect(
      normalizeMobileEventLocationType({
        address: {
          city: 'Cape Town',
        },
        locationType: 'Physical',
      }),
    ).toBe('venue');
  });

  it('formats online and tba labels with sensible fallbacks', () => {
    expect(formatMobileLocationLabel({ details: 'Zoom webinar', locationType: 'online' })).toBe('Zoom webinar');
    expect(formatMobileLocationLabel({ locationType: 'online' })).toBe('Online');
    expect(formatMobileLocationLabel({ locationType: 'tba' })).toBe('Location to be announced');
  });

  it('builds shared online payloads without a venue reference', () => {
    expect(
      buildMobileEventLocationPayload({
        city: '',
        country: '',
        locationDetails: 'Google Meet',
        locationType: 'online',
        postalCode: '',
        state: '',
        venueId: '',
      }),
    ).toEqual({
      location: {
        details: 'Google Meet',
        locationType: 'online',
      },
      locationSnapshot: 'Google Meet',
      venueId: undefined,
    });
  });

  it('builds venue payloads from a custom address when no venue is selected', () => {
    expect(
      buildMobileEventLocationPayload({
        city: 'Johannesburg',
        country: 'South Africa',
        locationDetails: 'Main hall',
        locationType: 'venue',
        postalCode: '2000',
        state: 'Gauteng',
        venueId: '',
      }),
    ).toEqual({
      location: {
        address: {
          city: 'Johannesburg',
          country: 'South Africa',
          state: 'Gauteng',
          zipCode: '2000',
        },
        coordinates: undefined,
        details: 'Main hall',
        locationType: 'venue',
      },
      locationSnapshot: 'Johannesburg, Gauteng, South Africa',
      venueId: undefined,
    });
  });

  it('requires a complete custom address when venue mode has no selected venue', () => {
    expect(
      validateMobileEventLocation({
        city: 'Johannesburg',
        country: 'South Africa',
        locationDetails: '',
        locationType: 'venue',
        postalCode: '',
        state: 'Gauteng',
        venueId: '',
      }),
    ).toBe('Please choose a venue or complete the custom address fields.');
  });

  it('builds compact address summaries for physical venues', () => {
    expect(
      buildLocationSummaryFromAddress({
        city: 'Johannesburg',
        country: 'South Africa',
        state: 'Gauteng',
      }),
    ).toBe('Johannesburg, Gauteng, South Africa');
  });

  it('only enables directions when a venue has a usable address summary', () => {
    expect(
      hasUsableVenueAddress({
        address: {
          city: 'Johannesburg',
          country: 'South Africa',
          state: 'Gauteng',
        },
        locationType: 'venue',
      }),
    ).toBe(true);

    expect(
      hasUsableVenueAddress({
        details: 'Main hall',
        locationType: 'venue',
      }),
    ).toBe(false);

    expect(
      hasUsableVenueAddress({
        details: 'Zoom webinar',
        locationType: 'online',
      }),
    ).toBe(false);
  });
});
