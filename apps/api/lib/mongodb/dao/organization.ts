import {Organization as OrganizationModel} from '@/mongodb/models';
import type {CreateOrganizationInput, Organization, QueryOptionsInput, UpdateOrganizationInput} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {GraphQLError} from 'graphql';
import {logger} from '@/utils/logger';

class OrganizationDAO {
  static async create(input: CreateOrganizationInput): Promise<Organization> {
    try {
      const organization = await OrganizationModel.create(input);
      return organization.toObject();
    } catch (error) {
      logger.error('Error creating organization', error);
      throw KnownCommonError(error);
    }
  }

  static async readOrganizationById(orgId: string): Promise<Organization> {
    try {
      const query = OrganizationModel.findById(orgId);
      const organization = await query.exec();
      if (!organization) {
        throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
      }
      return organization.toObject();
    } catch (error) {
      logger.error(`Error reading organization by id ${orgId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readOrganizationBySlug(slug: string): Promise<Organization> {
    try {
      const query = OrganizationModel.findOne({slug});
      const organization = await query.exec();
      if (!organization) {
        throw CustomError(`Organization with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return organization.toObject();
    } catch (error) {
      logger.error(`Error reading organization by slug ${slug}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readOrganizations(options?: QueryOptionsInput): Promise<Organization[]> {
    try {
      const query = options ? transformOptionsToQuery(OrganizationModel, options) : OrganizationModel.find({});
      const organizations = await query.exec();
      return organizations.map((organization) => organization.toObject());
    } catch (error) {
      logger.error('Error reading organizations', error);
      throw KnownCommonError(error);
    }
  }

  static async updateOrganization(input: UpdateOrganizationInput): Promise<Organization> {
    try {
      const {orgId, ...rest} = input;
      const organization = await OrganizationModel.findById(orgId).exec();
      if (!organization) {
        throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
      }
      
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(rest).filter(([_, value]) => value !== undefined)
      );
      Object.assign(organization, fieldsToUpdate);
      await organization.save();
      
      return organization.toObject();
    } catch (error) {
      logger.error(`Error updating organization ${input.orgId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteOrganizationById(orgId: string): Promise<Organization> {
    try {
      const deletedOrganization = await OrganizationModel.findByIdAndDelete(orgId).exec();
      if (!deletedOrganization) {
        throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedOrganization.toObject();
    } catch (error) {
      logger.error(`Error deleting organization ${orgId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default OrganizationDAO;
