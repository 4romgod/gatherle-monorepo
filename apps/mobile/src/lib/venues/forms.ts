import { VenueType, type CreateVenueInput } from '@data/graphql/types/graphql';

export type VenueFormState = {
  capacity: string;
  city: string;
  country: string;
  name: string;
  postalCode: string;
  region: string;
  street: string;
  type: VenueType;
  url: string;
};

export const initialVenueFormState: VenueFormState = {
  capacity: '',
  city: '',
  country: '',
  name: '',
  postalCode: '',
  region: '',
  street: '',
  type: VenueType.Physical,
  url: '',
};

export function createVenueFormState(
  venue?: {
    address?: {
      city?: string | null;
      country?: string | null;
      postalCode?: string | null;
      region?: string | null;
      street?: string | null;
    } | null;
    capacity?: number | null;
    name?: string | null;
    type?: VenueType | null;
    url?: string | null;
  } | null,
): VenueFormState {
  return {
    capacity: venue?.capacity != null ? String(venue.capacity) : '',
    city: venue?.address?.city ?? '',
    country: venue?.address?.country ?? '',
    name: venue?.name ?? '',
    postalCode: venue?.address?.postalCode ?? '',
    region: venue?.address?.region ?? '',
    street: venue?.address?.street ?? '',
    type: venue?.type ?? VenueType.Physical,
    url: venue?.url ?? '',
  };
}

export function validateVenueForm(formState: VenueFormState): string | null {
  if (!formState.name.trim()) {
    return 'Venue name is required.';
  }

  const requiresAddress = formState.type !== VenueType.Virtual;
  if (requiresAddress && (!formState.city.trim() || !formState.country.trim())) {
    return 'Physical and hybrid venues need both a city and country.';
  }

  return null;
}

export function buildVenueInput(
  formState: VenueFormState,
): Pick<CreateVenueInput, 'address' | 'capacity' | 'name' | 'type' | 'url'> {
  const capacityNum = formState.capacity.trim() ? Number.parseInt(formState.capacity, 10) : undefined;
  const address =
    formState.city.trim() && formState.country.trim()
      ? {
          city: formState.city.trim(),
          country: formState.country.trim(),
          postalCode: formState.postalCode.trim() || undefined,
          region: formState.region.trim() || undefined,
          street: formState.street.trim() || undefined,
        }
      : undefined;

  return {
    address,
    capacity: capacityNum != null && !Number.isNaN(capacityNum) ? capacityNum : undefined,
    name: formState.name.trim(),
    type: formState.type,
    url: formState.url.trim() || undefined,
  };
}
