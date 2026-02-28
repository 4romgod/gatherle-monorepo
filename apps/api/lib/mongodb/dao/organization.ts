import { Organization as OrganizationModel } from '@/mongodb/models';
import type {
  CreateOrganizationInput,
  Organization,
  QueryOptionsInput,
  UpdateOrganizationInput,
} from '@gatherle/commons/types';
import { CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery , logDaoError } from '@/utils';

class OrganizationDAO {
  static async create(input: CreateOrganizationInput): Promise<Organization> {
    try {
      const organization = await OrganizationModel.create(input);
      return organization.toObject();
    } catch (error) {
      logDaoError('Error creating organization', { error });
      throw KnownCommonError(error);
    }
  }

  static async readOrganizationById(orgId: string): Promise<Organization> {
    let organization;
    try {
      const query = OrganizationModel.findById(orgId);
      organization = await query.exec();
    } catch (error) {
      logDaoError(`Error reading organization by id ${orgId}`, { error });
      throw KnownCommonError(error);
    }
    if (!organization) {
      throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
    }
    return organization.toObject();
  }

  static async readOrganizationBySlug(slug: string): Promise<Organization> {
    let organization;
    try {
      const query = OrganizationModel.findOne({ slug });
      organization = await query.exec();
    } catch (error) {
      logDaoError(`Error reading organization by slug ${slug}`, { error });
      throw KnownCommonError(error);
    }
    if (!organization) {
      throw CustomError(`Organization with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return organization.toObject();
  }

  static async readOrganizations(options?: QueryOptionsInput): Promise<Organization[]> {
    try {
      const query = options ? transformOptionsToQuery(OrganizationModel, options) : OrganizationModel.find({});
      const organizations = await query.exec();
      return organizations.map((organization) => organization.toObject());
    } catch (error) {
      logDaoError('Error reading organizations', { error });
      throw KnownCommonError(error);
    }
  }

  static async readOrganizationsByIds(orgIds: string[]): Promise<Organization[]> {
    if (orgIds.length === 0) {
      return [];
    }
    try {
      const organizations = await OrganizationModel.find({ orgId: { $in: orgIds } }).exec();
      return organizations.map((organization) => organization.toObject());
    } catch (error) {
      logDaoError('Error reading organizations by ids', { error });
      throw KnownCommonError(error);
    }
  }

  static async updateOrganization(input: UpdateOrganizationInput): Promise<Organization> {
    const { orgId, ...rest } = input;
    let organization;
    try {
      organization = await OrganizationModel.findById(orgId).exec();
    } catch (error) {
      logDaoError(`Error finding organization for update ${orgId}`, { error });
      throw KnownCommonError(error);
    }
    if (!organization) {
      throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
    }

    try {
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(rest).filter(([_, value]) => value !== undefined));
      Object.assign(organization, fieldsToUpdate);
      await organization.save();
      return organization.toObject();
    } catch (error) {
      logDaoError(`Error updating organization ${orgId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async deleteOrganizationById(orgId: string): Promise<Organization> {
    let deletedOrganization;
    try {
      deletedOrganization = await OrganizationModel.findByIdAndDelete(orgId).exec();
    } catch (error) {
      logDaoError(`Error deleting organization ${orgId}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedOrganization) {
      throw CustomError(`Organization with id ${orgId} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedOrganization.toObject();
  }
}

export default OrganizationDAO;
