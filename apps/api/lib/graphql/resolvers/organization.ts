import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx } from 'type-graphql';
import {
  CreateOrganizationInput,
  FollowTargetType,
  MyOrganization,
  Organization,
  OrganizationMembership,
  OrganizationRole,
  QueryOptionsInput,
  UpdateOrganizationInput,
  UserRole,
} from '@ntlango/commons/types';
import { FollowDAO, OrganizationDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { validateInput, validateMongodbId } from '@/validation';
import { CreateOrganizationInputSchema, UpdateOrganizationInputSchema } from '@/validation/zod';
import { ERROR_MESSAGES } from '@/validation';
import { getAuthenticatedUser } from '@/utils';
import { OrganizationMembershipService } from '@/services';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';
import { deleteFromS3, getKeyFromPublicUrl } from '@/clients/AWS/s3Client';

@Resolver(() => Organization)
export class OrganizationResolver {
  @FieldResolver(() => [OrganizationMembership], { nullable: true })
  async memberRoles(@Root() organization: Organization): Promise<OrganizationMembership[]> {
    if (!organization.orgId) {
      return [];
    }
    return OrganizationMembershipDAO.readMembershipsByOrgId(organization.orgId);
  }

  @FieldResolver(() => Number)
  async followersCount(@Root() organization: Organization): Promise<number> {
    if (!organization.orgId) {
      return 0;
    }
    return FollowDAO.countFollowers(FollowTargetType.Organization, organization.orgId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Organization, { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.createOrganization })
  async createOrganization(
    @Arg('input', () => CreateOrganizationInput) input: CreateOrganizationInput,
    @Ctx() context: ServerContext,
  ): Promise<Organization> {
    const user = getAuthenticatedUser(context);

    // Override ownerId to ensure creator becomes owner (security measure)
    input.ownerId = user.userId;

    validateInput<CreateOrganizationInput>(CreateOrganizationInputSchema, input);

    const organization = await OrganizationDAO.create(input);

    // Automatically create Owner membership for the creator.
    // If membership creation fails, attempt to roll back the organization creation
    // to avoid leaving the system in an inconsistent state (org without owner membership).
    try {
      await OrganizationMembershipService.addMember(
        {
          orgId: organization.orgId,
          userId: user.userId,
          role: OrganizationRole.Owner,
        },
        user.userId,
      );
    } catch (error) {
      // Rollback: delete organization if membership creation fails
      if (organization.orgId) {
        try {
          await OrganizationDAO.deleteOrganizationById(organization.orgId);
        } catch (rollbackError) {
          logger.error('Failed to roll back organization creation after membership creation error', {
            orgId: organization.orgId,
            originalError: error,
            rollbackError,
          });
        }
      }
      throw error;
    }

    return organization;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Organization, { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.updateOrganization })
  async updateOrganization(
    @Arg('input', () => UpdateOrganizationInput) input: UpdateOrganizationInput,
  ): Promise<Organization> {
    validateInput<UpdateOrganizationInput>(UpdateOrganizationInputSchema, input);
    validateMongodbId(input.orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', input.orgId));
    return OrganizationDAO.updateOrganization(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Organization, { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.deleteOrganizationById })
  async deleteOrganizationById(@Arg('orgId', () => String) orgId: string): Promise<Organization> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    const organization = await OrganizationDAO.deleteOrganizationById(orgId);
    const keysToDelete = new Set<string>();

    if (organization.logo) {
      const key = getKeyFromPublicUrl(organization.logo);
      if (key) {
        keysToDelete.add(key);
      }
    }

    if (keysToDelete.size > 0) {
      await Promise.all(
        Array.from(keysToDelete).map(async (key) => {
          try {
            await deleteFromS3(key);
            logger.info('Deleted associated S3 object after organization removal', { orgId, key });
          } catch (err) {
            logger.warn('Failed to delete S3 object for removed organization', { orgId, key, error: err });
          }
        }),
      );
    }

    return organization;
  }

  @Query(() => Organization, { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizationById })
  async readOrganizationById(@Arg('orgId', () => String) orgId: string): Promise<Organization> {
    validateMongodbId(orgId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId));
    return OrganizationDAO.readOrganizationById(orgId);
  }

  @Query(() => Organization, { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizationBySlug })
  async readOrganizationBySlug(@Arg('slug', () => String) slug: string): Promise<Organization> {
    return OrganizationDAO.readOrganizationBySlug(slug);
  }

  @Query(() => [Organization], { description: RESOLVER_DESCRIPTIONS.ORGANIZATION.readOrganizations })
  async readOrganizations(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
  ): Promise<Organization[]> {
    return OrganizationDAO.readOrganizations(options);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [MyOrganization], {
    description: 'Read organizations that the current user belongs to, along with their role.',
  })
  async readMyOrganizations(@Ctx() context: ServerContext): Promise<MyOrganization[]> {
    const user = getAuthenticatedUser(context);
    const memberships = await OrganizationMembershipDAO.readMembershipsByUserId(user.userId);
    if (memberships.length === 0) {
      return [];
    }

    const organizations = await OrganizationDAO.readOrganizationsByIds(
      memberships.map((membership) => membership.orgId),
    );
    const organizationMap = new Map(organizations.map((organization) => [organization.orgId, organization]));

    return memberships
      .map((membership) => {
        const organization = organizationMap.get(membership.orgId);
        if (!organization) {
          return null;
        }
        return {
          organization,
          role: membership.role,
        };
      })
      .filter((entry): entry is MyOrganization => Boolean(entry));
  }
}
