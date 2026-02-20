import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized } from 'type-graphql';
import { CreateVenueInput, QueryOptionsInput, UpdateVenueInput, UserRole, Venue } from '@gatherle/commons/types';
import { VenueDAO } from '@/mongodb/dao';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { validateInput, validateMongodbId } from '@/validation';
import { CreateVenueInputSchema, UpdateVenueInputSchema } from '@/validation/zod';
import { ERROR_MESSAGES } from '@/validation';

@Resolver(() => Venue)
export class VenueResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Venue, { description: RESOLVER_DESCRIPTIONS.VENUE.createVenue })
  async createVenue(@Arg('input', () => CreateVenueInput) input: CreateVenueInput): Promise<Venue> {
    validateInput<CreateVenueInput>(CreateVenueInputSchema, input);
    return VenueDAO.create(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Venue, { description: RESOLVER_DESCRIPTIONS.VENUE.updateVenue })
  async updateVenue(@Arg('input', () => UpdateVenueInput) input: UpdateVenueInput): Promise<Venue> {
    validateInput<UpdateVenueInput>(UpdateVenueInputSchema, input);
    validateMongodbId(input.venueId, ERROR_MESSAGES.NOT_FOUND('Venue', 'ID', input.venueId));
    return VenueDAO.update(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Venue, { description: RESOLVER_DESCRIPTIONS.VENUE.deleteVenueById })
  async deleteVenueById(@Arg('venueId', () => String) venueId: string): Promise<Venue> {
    validateMongodbId(venueId, ERROR_MESSAGES.NOT_FOUND('Venue', 'ID', venueId));
    return VenueDAO.delete(venueId);
  }

  @Query(() => Venue, { description: RESOLVER_DESCRIPTIONS.VENUE.readVenueById })
  async readVenueById(@Arg('venueId', () => String) venueId: string): Promise<Venue> {
    validateMongodbId(venueId, ERROR_MESSAGES.NOT_FOUND('Venue', 'ID', venueId));
    return VenueDAO.readVenueById(venueId);
  }

  @Query(() => Venue, { description: RESOLVER_DESCRIPTIONS.VENUE.readVenueBySlug })
  async readVenueBySlug(@Arg('slug', () => String) slug: string): Promise<Venue> {
    return VenueDAO.readVenueBySlug(slug);
  }

  @Query(() => [Venue], { description: RESOLVER_DESCRIPTIONS.VENUE.readVenues })
  async readVenues(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
  ): Promise<Venue[]> {
    return VenueDAO.readVenues(options);
  }

  @Query(() => [Venue], { description: RESOLVER_DESCRIPTIONS.VENUE.readVenuesByOrgId })
  async readVenuesByOrgId(@Arg('orgId', () => String) orgId: string): Promise<Venue[]> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    return VenueDAO.readVenuesByOrgId(orgId);
  }
}
