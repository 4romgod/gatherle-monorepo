import type { GetVenueByIdQuery, GetVenuesQuery } from '../../types/graphql';

export type MobileVenue = GetVenuesQuery['readVenues'][number];
export type MobileVenueProfile = NonNullable<GetVenueByIdQuery['readVenueById']>;
