import 'reflect-metadata';
import { OrganizationMembershipResolver } from '@/graphql/resolvers/organizationMembership';
import { OrganizationMembershipDAO } from '@/mongodb/dao';
import { OrganizationMembershipService } from '@/services';
import type {
  CreateOrganizationMembershipInput,
  DeleteOrganizationMembershipInput,
  OrganizationMembership,
  UpdateOrganizationMembershipInput,
} from '@gatherle/commons/types';
import { OrganizationRole } from '@gatherle/commons/types';
import * as validation from '@/validation';
import type { ServerContext } from '@/graphql';

jest.mock('@/mongodb/dao', () => ({
  OrganizationMembershipDAO: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    readMembershipById: jest.fn(),
    readMembershipsByOrgId: jest.fn(),
  },
}));

jest.mock('@/services', () => ({
  OrganizationMembershipService: {
    addMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
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

describe('OrganizationMembershipResolver', () => {
  let resolver: OrganizationMembershipResolver;

  const mockMembership: OrganizationMembership = {
    membershipId: 'membership-001',
    orgId: 'org-001',
    userId: 'user-002',
    role: OrganizationRole.Member,
    joinedAt: new Date(),
  };

  const mockContext = {
    user: { userId: 'admin-user-001', email: 'admin@test.com' },
  } as ServerContext;

  beforeEach(() => {
    resolver = new OrganizationMembershipResolver();
    jest.clearAllMocks();
    (validation.validateInput as jest.Mock).mockImplementation(() => undefined);
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => undefined);
  });

  describe('createOrganizationMembership', () => {
    const createInput: CreateOrganizationMembershipInput = {
      orgId: mockMembership.orgId,
      userId: mockMembership.userId,
      role: mockMembership.role,
    };

    it('validates input and creates membership via service', async () => {
      (OrganizationMembershipService.addMember as jest.Mock).mockResolvedValue(mockMembership);

      const result = await resolver.createOrganizationMembership(createInput, mockContext);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(OrganizationMembershipService.addMember).toHaveBeenCalledWith(createInput, 'admin-user-001');
      expect(result).toEqual(mockMembership);
    });
  });

  describe('updateOrganizationMembership', () => {
    const updateInput: UpdateOrganizationMembershipInput = {
      membershipId: mockMembership.membershipId,
      role: OrganizationRole.Host,
    };

    it('validates id before updating via service', async () => {
      (OrganizationMembershipService.updateMemberRole as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: OrganizationRole.Host,
      });

      const result = await resolver.updateOrganizationMembership(updateInput, mockContext);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(validation.validateMongodbId).toHaveBeenCalledWith(updateInput.membershipId, expect.any(String));
      expect(OrganizationMembershipService.updateMemberRole).toHaveBeenCalledWith(updateInput, 'admin-user-001');
      expect(result.role).toBe(OrganizationRole.Host);
    });
  });

  describe('deleteOrganizationMembership', () => {
    const deleteInput: DeleteOrganizationMembershipInput = {
      membershipId: mockMembership.membershipId,
    };

    it('validates id before deleting via service', async () => {
      (OrganizationMembershipService.removeMember as jest.Mock).mockResolvedValue(mockMembership);

      const result = await resolver.deleteOrganizationMembership(deleteInput, mockContext);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(validation.validateMongodbId).toHaveBeenCalledWith(deleteInput.membershipId, expect.any(String));
      expect(OrganizationMembershipService.removeMember).toHaveBeenCalledWith(
        deleteInput.membershipId,
        'admin-user-001',
      );
      expect(result).toEqual(mockMembership);
    });
  });

  describe('readOrganizationMembershipById', () => {
    it('validates id and reads membership', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);

      const result = await resolver.readOrganizationMembershipById(mockMembership.membershipId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockMembership.membershipId, expect.any(String));
      expect(OrganizationMembershipDAO.readMembershipById).toHaveBeenCalledWith(mockMembership.membershipId);
      expect(result).toEqual(mockMembership);
    });
  });

  describe('readOrganizationMembershipsByOrgId', () => {
    it('validates orgId and returns memberships', async () => {
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([mockMembership]);

      const result = await resolver.readOrganizationMembershipsByOrgId(mockMembership.orgId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(
        mockMembership.orgId,
        expect.stringContaining('Organization'),
      );
      expect(OrganizationMembershipDAO.readMembershipsByOrgId).toHaveBeenCalledWith(mockMembership.orgId);
      expect(result).toEqual([mockMembership]);
    });
  });
});
