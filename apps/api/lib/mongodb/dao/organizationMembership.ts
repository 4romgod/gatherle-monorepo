import {OrganizationMembership as OrganizationMembershipModel} from '@/mongodb/models';
import type {
  CreateOrganizationMembershipInput,
  OrganizationMembership,
  UpdateOrganizationMembershipInput,
} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';
import {GraphQLError} from 'graphql';

class OrganizationMembershipDAO {
  static async create(input: CreateOrganizationMembershipInput): Promise<OrganizationMembership> {
    try {
      const membership = await OrganizationMembershipModel.create(input);
      return membership.toObject();
    } catch (error) {
      console.error('Error creating organization membership', error);
      throw KnownCommonError(error);
    }
  }

  static async readMembershipById(membershipId: string): Promise<OrganizationMembership> {
    try {
      const query = OrganizationMembershipModel.findOne({membershipId});
      const membership = await query.exec();
      if (!membership) {
        throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
      }
      return membership.toObject();
    } catch (error) {
      console.error(`Error reading membership ${membershipId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readMembershipsByOrgId(orgId: string): Promise<OrganizationMembership[]> {
    try {
      const memberships = await OrganizationMembershipModel.find({orgId}).exec();
      return memberships.map((membership) => membership.toObject());
    } catch (error) {
      console.error(`Error reading memberships for org ${orgId}`, error);
      throw KnownCommonError(error);
    }
  }

  static async update(input: UpdateOrganizationMembershipInput): Promise<OrganizationMembership> {
    try {
      const {membershipId, ...rest} = input;
      const updatedMembership = await OrganizationMembershipModel.findOneAndUpdate({membershipId}, rest, {
        new: true,
      }).exec();
      if (!updatedMembership) {
        throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
      }
      return updatedMembership.toObject();
    } catch (error) {
      console.error(`Error updating membership ${input.membershipId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async delete(membershipId: string): Promise<OrganizationMembership> {
    try {
      const deletedMembership = await OrganizationMembershipModel.findOneAndDelete({membershipId}).exec();
      if (!deletedMembership) {
        throw CustomError(`Organization membership ${membershipId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedMembership.toObject();
    } catch (error) {
      console.error(`Error deleting membership ${membershipId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default OrganizationMembershipDAO;
