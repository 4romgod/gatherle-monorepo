import { GraphQLError } from 'graphql';
import { OrganizationDAO } from '@/mongodb/dao';
import { Organization as OrganizationModel } from '@/mongodb/models';
import type {
  CreateOrganizationInput,
  Organization,
  QueryOptionsInput,
  UpdateOrganizationInput,
} from '@ntlango/commons/types';
import { CustomError, ErrorTypes, transformOptionsToQuery } from '@/utils';
import { MockMongoError } from '@/test/utils';
import { ERROR_MESSAGES } from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Organization: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('@/utils/queries/query', () => ({
  transformOptionsToQuery: jest.fn(),
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  exec: jest.fn().mockRejectedValue(error),
});

describe('OrganizationDAO', () => {
  const mockOrganization: Organization = {
    orgId: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    description: 'Test Org Description',
    ownerId: 'owner-1',
    isFollowable: true,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates organization', async () => {
      (OrganizationModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockOrganization,
      });

      const input: CreateOrganizationInput = {
        name: 'Test Org',
        description: 'Test Org Description',
        ownerId: 'owner-1',
      };

      const result = await OrganizationDAO.create(input);

      expect(OrganizationModel.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockOrganization);
    });

    it('wraps errors', async () => {
      (OrganizationModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(
        OrganizationDAO.create({
          name: 'Test Org',
          description: 'Test Org Description',
          ownerId: 'owner-1',
        }),
      ).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('readOrganizationById', () => {
    it('reads organization by id', async () => {
      (OrganizationModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockOrganization,
        }),
      );

      const result = await OrganizationDAO.readOrganizationById('org-1');

      expect(OrganizationModel.findById).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(mockOrganization);
    });

    it('throws not found error', async () => {
      (OrganizationModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationDAO.readOrganizationById('missing')).rejects.toThrow(
        CustomError('Organization with id missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (OrganizationModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(OrganizationDAO.readOrganizationById('org-1')).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (OrganizationModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationDAO.readOrganizationById('org-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readOrganizationBySlug', () => {
    it('reads organization by slug', async () => {
      (OrganizationModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockOrganization,
        }),
      );

      const result = await OrganizationDAO.readOrganizationBySlug('test-org');

      expect(OrganizationModel.findOne).toHaveBeenCalledWith({ slug: 'test-org' });
      expect(result).toEqual(mockOrganization);
    });

    it('throws not found error', async () => {
      (OrganizationModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationDAO.readOrganizationBySlug('missing')).rejects.toThrow(
        CustomError('Organization with slug missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('wraps unknown errors', async () => {
      (OrganizationModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationDAO.readOrganizationBySlug('test-org')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readOrganizations', () => {
    it('reads organizations with options', async () => {
      const queryResult = createMockSuccessMongooseQuery([
        {
          toObject: () => mockOrganization,
        },
      ]);
      (transformOptionsToQuery as jest.Mock).mockReturnValue(queryResult);

      const options: QueryOptionsInput = { pagination: { limit: 5, skip: 0 } };
      const result = await OrganizationDAO.readOrganizations(options);

      expect(transformOptionsToQuery).toHaveBeenCalledWith(OrganizationModel, options);
      expect(result).toEqual([mockOrganization]);
    });

    it('wraps errors', async () => {
      (OrganizationModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationDAO.readOrganizations()).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('updateOrganization', () => {
    it('updates organization', async () => {
      const mockSave = jest.fn().mockResolvedValue({ toObject: () => mockOrganization });
      (OrganizationModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...mockOrganization,
          save: mockSave,
          toObject: () => mockOrganization,
        }),
      );

      const input: UpdateOrganizationInput = {
        orgId: 'org-1',
        name: 'Updated Org',
      };

      const result = await OrganizationDAO.updateOrganization(input);

      expect(OrganizationModel.findById).toHaveBeenCalledWith('org-1');
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('throws not found error', async () => {
      (OrganizationModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationDAO.updateOrganization({ orgId: 'missing' })).rejects.toThrow(
        CustomError('Organization with id missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('wraps unknown errors', async () => {
      (OrganizationModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(OrganizationDAO.updateOrganization({ orgId: 'org-1' })).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('deleteOrganizationById', () => {
    it('deletes organization', async () => {
      (OrganizationModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockOrganization,
        }),
      );

      const result = await OrganizationDAO.deleteOrganizationById('org-1');

      expect(OrganizationModel.findByIdAndDelete).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(mockOrganization);
    });

    it('throws not found error', async () => {
      (OrganizationModel.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(OrganizationDAO.deleteOrganizationById('missing')).rejects.toThrow(
        CustomError('Organization with id missing not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('wraps unknown errors', async () => {
      (OrganizationModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new MockMongoError(0)),
      );

      await expect(OrganizationDAO.deleteOrganizationById('org-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
