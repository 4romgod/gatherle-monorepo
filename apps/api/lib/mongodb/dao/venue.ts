import { kebabCase } from 'lodash';
import { Venue as VenueModel } from '@/mongodb/models';
import type { CreateVenueInput, QueryOptionsInput, UpdateVenueInput, Venue } from '@gatherle/commons/types';
import { CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery, logDaoError } from '@/utils';
import { GraphQLError } from 'graphql';

const buildVenueSlug = (venue: Partial<Venue>) => {
  const fallbackSource = venue.name ?? venue.venueId ?? 'venue';
  return kebabCase(fallbackSource);
};

const ensureVenueSlug = (venue: Partial<Venue>): Venue =>
  ({
    ...venue,
    slug: venue.slug ?? buildVenueSlug(venue),
  }) as Venue;

class VenueDAO {
  static async create(input: CreateVenueInput): Promise<Venue> {
    try {
      const venue = await VenueModel.create(input);
      return ensureVenueSlug(venue.toObject());
    } catch (error) {
      logDaoError('Error creating venue', { error });
      throw KnownCommonError(error);
    }
  }

  static async readVenueById(venueId: string): Promise<Venue> {
    try {
      const query = VenueModel.findOne({ venueId });
      const venue = await query.exec();
      if (!venue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }
      return ensureVenueSlug(venue.toObject());
    } catch (error) {
      logDaoError(`Error reading venue ${venueId}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readVenueBySlug(slug: string): Promise<Venue> {
    try {
      const query = VenueModel.findOne({ slug });
      const venue = await query.exec();
      if (!venue) {
        throw CustomError(`Venue with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return ensureVenueSlug(venue.toObject());
    } catch (error) {
      logDaoError(`Error reading venue slug ${slug}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readVenues(options?: QueryOptionsInput): Promise<Venue[]> {
    try {
      const query = options ? transformOptionsToQuery(VenueModel, options) : VenueModel.find({});
      const venues = await query.exec();
      return venues.map((venue) => ensureVenueSlug(venue.toObject()));
    } catch (error) {
      logDaoError('Error reading venues', { error });
      throw KnownCommonError(error);
    }
  }

  static async readVenuesByOrgId(orgId: string): Promise<Venue[]> {
    try {
      const venues = await VenueModel.find({ orgId }).exec();
      return venues.map((venue) => ensureVenueSlug(venue.toObject()));
    } catch (error) {
      logDaoError(`Error reading venues for org ${orgId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async update(input: UpdateVenueInput): Promise<Venue> {
    try {
      const { venueId, ...rest } = input;
      const venue = await VenueModel.findOne({ venueId }).exec();
      if (!venue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }

      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(rest).filter(([_, value]) => value !== undefined));
      Object.assign(venue, fieldsToUpdate);
      await venue.save();

      return ensureVenueSlug(venue.toObject());
    } catch (error) {
      logDaoError(`Error updating venue ${input.venueId}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async delete(venueId: string): Promise<Venue> {
    try {
      const deletedVenue = await VenueModel.findOneAndDelete({ venueId }).exec();
      if (!deletedVenue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }
      return ensureVenueSlug(deletedVenue.toObject());
    } catch (error) {
      logDaoError(`Error deleting venue ${venueId}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default VenueDAO;
