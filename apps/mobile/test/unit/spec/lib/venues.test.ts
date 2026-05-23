import { VenueType } from '@data/graphql/types/graphql';
import { buildVenueInput, createVenueFormState, initialVenueFormState, validateVenueForm } from '@/lib/venues/forms';

describe('mobile venue form helpers', () => {
  it('creates form state from an existing venue or defaults', () => {
    expect(initialVenueFormState).toMatchObject({ name: '', type: VenueType.Physical });
    expect(createVenueFormState(null)).toEqual(initialVenueFormState);
    expect(
      createVenueFormState({
        address: {
          city: 'Durban',
          country: 'South Africa',
          postalCode: '4001',
          region: 'KZN',
          street: '1 Beach Road',
        },
        capacity: 250,
        name: 'Signal Loft',
        type: VenueType.Hybrid,
        url: 'https://venue.example',
      }),
    ).toEqual({
      capacity: '250',
      city: 'Durban',
      country: 'South Africa',
      name: 'Signal Loft',
      postalCode: '4001',
      region: 'KZN',
      street: '1 Beach Road',
      type: VenueType.Hybrid,
      url: 'https://venue.example',
    });
  });

  it('validates name and address requirements by venue type', () => {
    expect(validateVenueForm({ ...initialVenueFormState, name: ' ' })).toBe('Venue name is required.');
    expect(validateVenueForm({ ...initialVenueFormState, name: 'Venue', city: 'Durban', country: ' ' })).toBe(
      'Physical and hybrid venues need both a city and country.',
    );
    expect(validateVenueForm({ ...initialVenueFormState, name: 'Venue', type: VenueType.Virtual })).toBeNull();
    expect(
      validateVenueForm({ ...initialVenueFormState, name: 'Venue', city: 'Durban', country: 'South Africa' }),
    ).toBeNull();
  });

  it('builds trimmed create input and ignores invalid optional capacity', () => {
    expect(
      buildVenueInput({
        capacity: ' 400 ',
        city: ' Durban ',
        country: ' South Africa ',
        name: ' Signal Loft ',
        postalCode: ' 4001 ',
        region: ' KZN ',
        street: ' 1 Beach Road ',
        type: VenueType.Physical,
        url: ' https://venue.example ',
      }),
    ).toEqual({
      address: {
        city: 'Durban',
        country: 'South Africa',
        postalCode: '4001',
        region: 'KZN',
        street: '1 Beach Road',
      },
      capacity: 400,
      name: 'Signal Loft',
      type: VenueType.Physical,
      url: 'https://venue.example',
    });

    expect(
      buildVenueInput({
        ...initialVenueFormState,
        capacity: 'not-a-number',
        name: 'Virtual room',
        type: VenueType.Virtual,
      }),
    ).toEqual({
      address: undefined,
      capacity: undefined,
      name: 'Virtual room',
      type: VenueType.Virtual,
      url: undefined,
    });
  });
});
