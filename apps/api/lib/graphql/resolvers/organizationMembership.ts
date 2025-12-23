import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {
  CreateOrganizationMembershipInput,
  DeleteOrganizationMembershipInput,
  OrganizationMembership,
  UpdateOrganizationMembershipInput,
  UserRole,
} from '@ntlango/commons/types';
import {OrganizationMembershipDAO} from '@/mongodb/dao';
import {RESOLVER_DESCRIPTIONS} from '@/constants';
import {validateInput, validateMongodbId} from '@/validation';
import {
  CreateOrganizationMembershipInputSchema,
  DeleteOrganizationMembershipInputSchema,
  UpdateOrganizationMembershipInputSchema,
} from '@/validation/zod';
import {ERROR_MESSAGES} from '@/validation';

@Resolver(() => OrganizationMembership)
export class OrganizationMembershipResolver {
  @Authorized([UserRole.Admin])
  @Mutation(() => OrganizationMembership, {
    description: RESOLVER_DESCRIPTIONS.ORGANIZATION_MEMBERSHIP.createOrganizationMembership,
  })
  async createOrganizationMembership(
    @Arg('input', () => CreateOrganizationMembershipInput) input: CreateOrganizationMembershipInput,
  ): Promise<OrganizationMembership> {
    validateInput<CreateOrganizationMembershipInput>(CreateOrganizationMembershipInputSchema, input);
    return OrganizationMembershipDAO.create(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => OrganizationMembership, {
    description: RESOLVER_DESCRIPTIONS.ORGANIZATION_MEMBERSHIP.updateOrganizationMembership,
  })
  async updateOrganizationMembership(
    @Arg('input', () => UpdateOrganizationMembershipInput) input: UpdateOrganizationMembershipInput,
  ): Promise<OrganizationMembership> {
    validateInput<UpdateOrganizationMembershipInput>(UpdateOrganizationMembershipInputSchema, input);
    validateMongodbId(input.membershipId, ERROR_MESSAGES.NOT_FOUND('Organization membership', 'ID', input.membershipId));
    return OrganizationMembershipDAO.update(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => OrganizationMembership, {
    description: RESOLVER_DESCRIPTIONS.ORGANIZATION_MEMBERSHIP.deleteOrganizationMembership,
  })
  async deleteOrganizationMembership(
    @Arg('input', () => DeleteOrganizationMembershipInput) input: DeleteOrganizationMembershipInput,
  ): Promise<OrganizationMembership> {
    validateInput<DeleteOrganizationMembershipInput>(DeleteOrganizationMembershipInputSchema, input);
    validateMongodbId(input.membershipId, ERROR_MESSAGES.NOT_FOUND('Organization membership', 'ID', input.membershipId));
    return OrganizationMembershipDAO.delete(input.membershipId);
  }

  @Query(() => OrganizationMembership, {
    description: RESOLVER_DESCRIPTIONS.ORGANIZATION_MEMBERSHIP.readOrganizationMembershipById,
  })
  async readOrganizationMembershipById(@Arg('membershipId', () => String) membershipId: string): Promise<OrganizationMembership> {
    validateMongodbId(membershipId, ERROR_MESSAGES.NOT_FOUND('Organization membership', 'ID', membershipId));
    return OrganizationMembershipDAO.readMembershipById(membershipId);
  }

  @Query(() => [OrganizationMembership], {
    description: RESOLVER_DESCRIPTIONS.ORGANIZATION_MEMBERSHIP.readOrganizationMembershipsByOrgId,
  })
  async readOrganizationMembershipsByOrgId(@Arg('orgId', () => String) orgId: string): Promise<OrganizationMembership[]> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    return OrganizationMembershipDAO.readMembershipsByOrgId(orgId);
  }
}
