import type { GetVenuesQuery } from '../../types/graphql';

export type MobileVenue = GetVenuesQuery['readVenues'][number];
