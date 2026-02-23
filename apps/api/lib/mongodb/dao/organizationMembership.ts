import { OrganizationMembership as OrganizationMembershipModel } from '@/mongodb/models';
import type {
  CreateOrganizationMembershipInput,
  OrganizationMembership,
  UpdateOrganizationMembershipInput,
} from '@gatherle/commons/types';
import { CustomError, ErrorTypes, KnownCommonError } from '@/utils';
import { logger } from '@/utils/logger';

class OrganizationMembershipDAO {
  static async create(input: CreateOrganizationMembershipInput): Promise<OrganizationMembership> {
    try {
      const membership = await OrganizationMembershipModel.create(input);
      return membership.toObject();
    } catch (error) {
      logger.error('Error creating organization membership', { error });
      throw KnownCommonError(error);
    }
  }

  static async readMembershipById(membershipId: string): Promise<OrganizationMembership> {
    let membership;
    try {
      const query = OrganizationMembershipModel.findOne({ membershipId });
      membership = await query.exec();
    } catch (error) {
      logger.error(`Error reading membership ${membershipId}`, { error });
      throw KnownCommonError(error);
    }
    if (!membership) {
      throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
    }
    return membership.toObject();
  }

  static async readMembershipsByOrgId(orgId: string): Promise<OrganizationMembership[]> {
    try {
      const memberships = await OrganizationMembershipModel.find({ orgId }).exec();
      return memberships.map((membership) => membership.toObject());
    } catch (error) {
      logger.error(`Error reading memberships for org ${orgId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readMembershipsByUserId(userId: string): Promise<OrganizationMembership[]> {
    try {
      const memberships = await OrganizationMembershipModel.find({ userId }).exec();
      return memberships.map((membership) => membership.toObject());
    } catch (error) {
      logger.error(`Error reading memberships for user ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readMembershipByOrgIdAndUser(orgId: string, userId: string): Promise<OrganizationMembership | null> {
    try {
      const membership = await OrganizationMembershipModel.findOne({ orgId, userId }).exec();
      return membership ? membership.toObject() : null;
    } catch (error) {
      logger.error(`Error reading membership for user ${userId} in org ${orgId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async update(input: UpdateOrganizationMembershipInput): Promise<OrganizationMembership> {
    const { membershipId, ...rest } = input;
    let membership;
    try {
      membership = await OrganizationMembershipModel.findOne({ membershipId }).exec();
    } catch (error) {
      logger.error(`Error finding membership for update ${membershipId}`, { error });
      throw KnownCommonError(error);
    }
    if (!membership) {
      throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
    }

    try {
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(rest).filter(([_, value]) => value !== undefined));
      Object.assign(membership, fieldsToUpdate);
      await membership.save();
      return membership.toObject();
    } catch (error) {
      logger.error(`Error updating membership ${membershipId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async delete(membershipId: string): Promise<OrganizationMembership> {
    let deletedMembership;
    try {
      deletedMembership = await OrganizationMembershipModel.findOneAndDelete({ membershipId }).exec();
    } catch (error) {
      logger.error(`Error deleting membership ${membershipId}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedMembership) {
      throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedMembership.toObject();
  }
}

export default OrganizationMembershipDAO;
