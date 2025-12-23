import {Venue as VenueModel} from '@/mongodb/models';
import type {CreateVenueInput, QueryOptionsInput, UpdateVenueInput, Venue} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {GraphQLError} from 'graphql';

class VenueDAO {
  static async create(input: CreateVenueInput): Promise<Venue> {
    try {
      const venue = await VenueModel.create(input);
      return venue.toObject();
    } catch (error) {
      console.error('Error creating venue', error);
      throw KnownCommonError(error);
    }
  }

  static async readVenueById(venueId: string): Promise<Venue> {
    try {
      const query = VenueModel.findOne({venueId});
      const venue = await query.exec();
      if (!venue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }
      return venue.toObject();
    } catch (error) {
      console.error(`Error reading venue ${venueId}`, error);
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
      return venues.map((venue) => venue.toObject());
    } catch (error) {
      console.error('Error reading venues', error);
      throw KnownCommonError(error);
    }
  }

  static async readVenuesByOrgId(orgId: string): Promise<Venue[]> {
    try {
      const venues = await VenueModel.find({orgId}).exec();
      return venues.map((venue) => venue.toObject());
    } catch (error) {
      console.error(`Error reading venues for org ${orgId}`, error);
      throw KnownCommonError(error);
    }
  }

  static async update(input: UpdateVenueInput): Promise<Venue> {
    try {
      const {venueId, ...rest} = input;
      const updatedVenue = await VenueModel.findOneAndUpdate({venueId}, rest, {new: true}).exec();
      if (!updatedVenue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }
      return updatedVenue.toObject();
    } catch (error) {
      console.error(`Error updating venue ${input.venueId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async delete(venueId: string): Promise<Venue> {
    try {
      const deletedVenue = await VenueModel.findOneAndDelete({venueId}).exec();
      if (!deletedVenue) {
        throw CustomError(`Venue with id ${venueId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedVenue.toObject();
    } catch (error) {
      console.error(`Error deleting venue ${venueId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default VenueDAO;
