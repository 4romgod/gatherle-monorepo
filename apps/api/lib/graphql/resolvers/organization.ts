import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root} from 'type-graphql';
import {
  CreateOrganizationInput,
  Organization,
  OrganizationMembership,
  QueryOptionsInput,
  UpdateOrganizationInput,
  UserRole,
} from '@ntlango/commons/types';
import {OrganizationDAO, OrganizationMembershipDAO} from '@/mongodb/dao';
import {RESOLVER_DESCRIPTIONS} from '@/constants';
import {validateInput, validateMongodbId} from '@/validation';
import {CreateOrganizationInputSchema, UpdateOrganizationInputSchema} from '@/validation/zod';
import {ERROR_MESSAGES} from '@/validation';

@Resolver(() => Organization)
export class OrganizationResolver {
  @FieldResolver(() => [OrganizationMembership], {nullable: true})
  async memberRoles(@Root() organization: Organization): Promise<OrganizationMembership[]> {
    if (!organization.orgId) {
      return [];
    }
    return OrganizationMembershipDAO.readMembershipsByOrgId(organization.orgId);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => Organization, {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.createOrganization})
  async createOrganization(@Arg('input', () => CreateOrganizationInput) input: CreateOrganizationInput): Promise<Organization> {
    validateInput<CreateOrganizationInput>(CreateOrganizationInputSchema, input);
    return OrganizationDAO.create(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => Organization, {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.updateOrganization})
  async updateOrganization(@Arg('input', () => UpdateOrganizationInput) input: UpdateOrganizationInput): Promise<Organization> {
    validateInput<UpdateOrganizationInput>(UpdateOrganizationInputSchema, input);
    validateMongodbId(input.orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', input.orgId));
    return OrganizationDAO.updateOrganization(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => Organization, {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.deleteOrganizationById})
  async deleteOrganizationById(@Arg('orgId', () => String) orgId: string): Promise<Organization> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    return OrganizationDAO.deleteOrganizationById(orgId);
  }

  @Query(() => Organization, {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizationById})
  async readOrganizationById(@Arg('orgId', () => String) orgId: string): Promise<Organization> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    return OrganizationDAO.readOrganizationById(orgId);
  }

  @Query(() => Organization, {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizationBySlug})
  async readOrganizationBySlug(@Arg('slug', () => String) slug: string): Promise<Organization> {
    return OrganizationDAO.readOrganizationBySlug(slug);
  }

  @Query(() => [Organization], {description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizations})
  async readOrganizations(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<Organization[]> {
    return OrganizationDAO.readOrganizations(options);
  }
}
