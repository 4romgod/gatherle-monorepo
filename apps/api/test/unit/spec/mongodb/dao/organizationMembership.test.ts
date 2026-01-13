import {GraphQLError} from 'graphql';
import {OrganizationMembershipDAO} from '@/mongodb/dao';
import {OrganizationMembership as OrganizationMembershipModel} from '@/mongodb/models';
import type {CreateOrganizationMembershipInput, OrganizationMembership, UpdateOrganizationMembershipInput} from '@ntlango/commons/types';
import {OrganizationRole} from '@ntlango/commons/types';
import {CustomError, ErrorTypes} from '@/utils';
import {MockMongoError} from '@/test/utils';
import {ERROR_MESSAGES} from '@/validation';

jest.mock('@/mongodb/models', () => ({
  OrganizationMembership: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  exec: jest.fn().mockRejectedValue(error),
});

describe('OrganizationMembershipDAO', () => {
  const mockMembership: OrganizationMembership = {
    membershipId: 'membership-1',
    orgId: 'org-1',
    userId: 'user-1',
    role: OrganizationRole.Admin,
    joinedAt: new Date('2024-01-01T00:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates membership', async () => {
      (OrganizationMembershipModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockMembership,
      });

      const input: CreateOrganizationMembershipInput = {
        orgId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.Admin,
      };

      const result = await OrganizationMembershipDAO.create(input);

      expect(OrganizationMembershipModel.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockMembership);
    });

    it('wraps errors', async () => {
      (OrganizationMembershipModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(
        OrganizationMembershipDAO.create({orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Admin}),
      ).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readMembershipById', () => {
    it('reads membership', async () => {
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockMembership,
        }),
      );

      const result = await OrganizationMembershipDAO.readMembershipById('membership-1');

      expect(OrganizationMembershipModel.findOne).toHaveBeenCalledWith({membershipId: 'membership-1'});
      expect(result).toEqual(mockMembership);
    });

    it('throws not found error', async () => {
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationMembershipDAO.readMembershipById('missing')).rejects.toThrow(
        CustomError('Organization membership missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(OrganizationMembershipDAO.readMembershipById('membership-1')).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationMembershipDAO.readMembershipById('membership-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readMembershipsByOrgId', () => {
    it('reads memberships', async () => {
      (OrganizationMembershipModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockMembership,
          },
        ]),
      );

      const result = await OrganizationMembershipDAO.readMembershipsByOrgId('org-1');

      expect(OrganizationMembershipModel.find).toHaveBeenCalledWith({orgId: 'org-1'});
      expect(result).toEqual([mockMembership]);
    });

    it('wraps errors', async () => {
      (OrganizationMembershipModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationMembershipDAO.readMembershipsByOrgId('org-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('update', () => {
    it('updates membership', async () => {
      const mockSave = jest.fn().mockResolvedValue({toObject: () => mockMembership});
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...mockMembership,
          save: mockSave,
          toObject: () => mockMembership,
        }),
      );

      const input: UpdateOrganizationMembershipInput = {
        membershipId: 'membership-1',
        role: OrganizationRole.Member,
      };

      const result = await OrganizationMembershipDAO.update(input);

      expect(OrganizationMembershipModel.findOne).toHaveBeenCalledWith({membershipId: 'membership-1'});
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockMembership);
    });

    it('throws not found error', async () => {
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationMembershipDAO.update({membershipId: 'missing'})).rejects.toThrow(
        CustomError('Organization membership missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('wraps unknown errors', async () => {
      (OrganizationMembershipModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationMembershipDAO.update({membershipId: 'membership-1'})).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('delete', () => {
    it('deletes membership', async () => {
      (OrganizationMembershipModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockMembership,
        }),
      );

      const result = await OrganizationMembershipDAO.delete('membership-1');

      expect(OrganizationMembershipModel.findOneAndDelete).toHaveBeenCalledWith({membershipId: 'membership-1'});
      expect(result).toEqual(mockMembership);
    });

    it('throws not found error', async () => {
      (OrganizationMembershipModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationMembershipDAO.delete('missing')).rejects.toThrow(
        CustomError('Organization membership missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('wraps unknown errors', async () => {
      (OrganizationMembershipModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationMembershipDAO.delete('membership-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
