import 'reflect-metadata';
import {OrganizationResolver} from '@/graphql/resolvers/organization';
import {OrganizationDAO, OrganizationMembershipDAO} from '@/mongodb/dao';
import {
  CreateOrganizationInput,
  Organization,
  OrganizationMembership,
  OrganizationRole,
  QueryOptionsInput,
  UpdateOrganizationInput,
} from '@ntlango/commons/types';
import {OrganizationTicketAccess} from '@ntlango/commons/types';
import * as validation from '@/validation';

jest.mock('@/mongodb/dao', () => ({
  OrganizationDAO: {
    create: jest.fn(),
    updateOrganization: jest.fn(),
    deleteOrganizationById: jest.fn(),
    readOrganizationById: jest.fn(),
    readOrganizationBySlug: jest.fn(),
    readOrganizations: jest.fn(),
  },
  OrganizationMembershipDAO: {
    readMembershipsByOrgId: jest.fn(),
  },
}));

jest.mock('@/validation', () => ({
  validateInput: jest.fn(),
  validateMongodbId: jest.fn(),
  ERROR_MESSAGES: {
    ATLEAST_ONE: (type: string) => `At least one ${type} is required`,
    INVALID: 'is invalid',
    INVALID_EVENT_STATUS: 'Invalid event status',
    REQUIRED: 'is required',
    DOES_NOT_EXIST: (searchedItemType: string, searchParamType: string, searchParamValue: string) =>
      `${searchedItemType} with ${searchParamType} ${searchParamValue} does not exist`,
    NOT_FOUND: (searchedItemType: string, searchParamType: string, searchParamValue: string) =>
      `${searchedItemType} with ${searchParamType} ${searchParamValue} does not exist`,
  },
}));

describe('OrganizationResolver', () => {
  let resolver: OrganizationResolver;

  const mockOrganization: Organization = {
    orgId: 'org-001',
    slug: 'org-001',
    name: 'Ntlango Lab',
    ownerId: 'user-001',
    allowedTicketAccess: OrganizationTicketAccess.Public,
    followersCount: 0,
    isFollowable: true,
  };

  beforeEach(() => {
    resolver = new OrganizationResolver();
    jest.clearAllMocks();
    (validation.validateInput as jest.Mock).mockImplementation(() => undefined);
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => undefined);
  });

  describe('memberRoles field resolver', () => {
    it('returns empty array when orgId is not provided', async () => {
      const result = await resolver.memberRoles({} as Organization);
      expect(result).toEqual([]);
      expect(OrganizationMembershipDAO.readMembershipsByOrgId).not.toHaveBeenCalled();
    });

    it('fetches memberships when orgId is provided', async () => {
      const memberships: OrganizationMembership[] = [
        {
          membershipId: 'membership-1',
          orgId: mockOrganization.orgId,
          userId: 'user-002',
          role: OrganizationRole.Owner,
          joinedAt: new Date(),
        },
      ];
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue(memberships);

      const result = await resolver.memberRoles(mockOrganization);

      expect(OrganizationMembershipDAO.readMembershipsByOrgId).toHaveBeenCalledWith(mockOrganization.orgId);
      expect(result).toEqual(memberships);
    });
  });

  describe('createOrganization', () => {
    const createInput: CreateOrganizationInput = {
      name: 'New Org',
      ownerId: 'user-001',
      allowedTicketAccess: OrganizationTicketAccess.Public,
    };

    it('validates input and delegates to DAO', async () => {
      (OrganizationDAO.create as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await resolver.createOrganization(createInput);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(OrganizationDAO.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('updateOrganization', () => {
    const updateInput: UpdateOrganizationInput = {
      orgId: mockOrganization.orgId,
      name: 'Updated Org',
    };

    it('validates and updates organization', async () => {
      (OrganizationDAO.updateOrganization as jest.Mock).mockResolvedValue({...mockOrganization, name: 'Updated Org'});

      const result = await resolver.updateOrganization(updateInput);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(validation.validateMongodbId).toHaveBeenCalledWith(updateInput.orgId, expect.any(String));
      expect(OrganizationDAO.updateOrganization).toHaveBeenCalledWith(updateInput);
      expect(result.name).toBe('Updated Org');
    });
  });

  describe('deleteOrganizationById', () => {
    it('validates id and calls DAO', async () => {
      (OrganizationDAO.deleteOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await resolver.deleteOrganizationById(mockOrganization.orgId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(
        mockOrganization.orgId,
        expect.stringContaining('Organization'),
      );
      expect(OrganizationDAO.deleteOrganizationById).toHaveBeenCalledWith(mockOrganization.orgId);
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('readOrganizationById', () => {
    it('validates id and returns organization', async () => {
      (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await resolver.readOrganizationById(mockOrganization.orgId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(
        mockOrganization.orgId,
        expect.stringContaining('Organization'),
      );
      expect(OrganizationDAO.readOrganizationById).toHaveBeenCalledWith(mockOrganization.orgId);
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('readOrganizationBySlug', () => {
    it('fetches using slug without validating id', async () => {
      (OrganizationDAO.readOrganizationBySlug as jest.Mock).mockResolvedValue(mockOrganization);
      const slug = mockOrganization.slug;

      const result = await resolver.readOrganizationBySlug(slug);

      expect(OrganizationDAO.readOrganizationBySlug).toHaveBeenCalledWith(slug);
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('readOrganizations', () => {
    it('calls DAO with query options when provided', async () => {
      const options: QueryOptionsInput = {filters: []};
      (OrganizationDAO.readOrganizations as jest.Mock).mockResolvedValue([mockOrganization]);

      const result = await resolver.readOrganizations(options);

      expect(OrganizationDAO.readOrganizations).toHaveBeenCalledWith(options);
      expect(result).toEqual([mockOrganization]);
    });
  });
});
