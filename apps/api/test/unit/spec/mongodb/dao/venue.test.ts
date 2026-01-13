import {GraphQLError} from 'graphql';
import {VenueDAO} from '@/mongodb/dao';
import {Venue as VenueModel} from '@/mongodb/models';
import type {CreateVenueInput, QueryOptionsInput, UpdateVenueInput, Venue} from '@ntlango/commons/types';
import {VenueType} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, transformOptionsToQuery} from '@/utils';
import {MockMongoError} from '@/test/utils';
import {ERROR_MESSAGES} from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Venue: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
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

describe('VenueDAO', () => {
  const mockVenue: Venue = {
    venueId: 'venue-1',
    orgId: 'org-1',
    type: VenueType.Physical,
    name: 'Test Venue',
    address: {
      street: '123 Test St',
      city: 'Test City',
      region: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates venue', async () => {
      (VenueModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockVenue,
      });

      const input: CreateVenueInput = {
        orgId: 'org-1',
        type: VenueType.Physical,
        name: 'Test Venue',
        address: {
          street: '123 Test St',
          city: 'Test City',
          region: 'Test State',
          country: 'Test Country',
          postalCode: '12345',
        },
      };

      const result = await VenueDAO.create(input);

      expect(VenueModel.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockVenue);
    });

    it('wraps errors', async () => {
      (VenueModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(
        VenueDAO.create({
          orgId: 'org-1',
          type: VenueType.Physical,
          name: 'Test Venue',
          address: {
            street: '123 Test St',
            city: 'Test City',
            region: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
          },
        }),
      ).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('readVenueById', () => {
    it('reads venue by id', async () => {
      (VenueModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockVenue,
        }),
      );

      const result = await VenueDAO.readVenueById('venue-1');

      expect(VenueModel.findOne).toHaveBeenCalledWith({venueId: 'venue-1'});
      expect(result).toEqual(mockVenue);
    });

    it('throws not found error', async () => {
      (VenueModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(VenueDAO.readVenueById('missing')).rejects.toThrow(CustomError('Venue with id missing not found', ErrorTypes.NOT_FOUND));
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (VenueModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(VenueDAO.readVenueById('venue-1')).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (VenueModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(VenueDAO.readVenueById('venue-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readVenues', () => {
    it('reads venues with options', async () => {
      const queryResult = createMockSuccessMongooseQuery([
        {
          toObject: () => mockVenue,
        },
      ]);
      (transformOptionsToQuery as jest.Mock).mockReturnValue(queryResult);

      const options: QueryOptionsInput = {pagination: {limit: 10, skip: 0}};
      const result = await VenueDAO.readVenues(options);

      expect(transformOptionsToQuery).toHaveBeenCalledWith(VenueModel, options);
      expect(result).toEqual([mockVenue]);
    });

    it('wraps errors', async () => {
      (VenueModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(VenueDAO.readVenues()).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('readVenuesByOrgId', () => {
    it('reads venues by org id', async () => {
      (VenueModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockVenue,
          },
        ]),
      );

      const result = await VenueDAO.readVenuesByOrgId('org-1');

      expect(VenueModel.find).toHaveBeenCalledWith({orgId: 'org-1'});
      expect(result).toEqual([mockVenue]);
    });

    it('wraps errors', async () => {
      (VenueModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(VenueDAO.readVenuesByOrgId('org-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('update', () => {
    it('updates venue', async () => {
      const mockSave = jest.fn().mockResolvedValue({toObject: () => mockVenue});
      (VenueModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...mockVenue,
          save: mockSave,
          toObject: () => mockVenue,
        }),
      );

      const input: UpdateVenueInput = {
        venueId: 'venue-1',
        name: 'Updated Venue',
      };

      const result = await VenueDAO.update(input);

      expect(VenueModel.findOne).toHaveBeenCalledWith({venueId: 'venue-1'});
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockVenue);
    });

    it('throws not found error', async () => {
      (VenueModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(VenueDAO.update({venueId: 'missing'})).rejects.toThrow(CustomError('Venue with id missing not found', ErrorTypes.NOT_FOUND));
    });

    it('wraps unknown errors', async () => {
      (VenueModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(VenueDAO.update({venueId: 'venue-1'})).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('delete', () => {
    it('deletes venue', async () => {
      (VenueModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockVenue,
        }),
      );

      const result = await VenueDAO.delete('venue-1');

      expect(VenueModel.findOneAndDelete).toHaveBeenCalledWith({venueId: 'venue-1'});
      expect(result).toEqual(mockVenue);
    });

    it('throws not found error', async () => {
      (VenueModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(VenueDAO.delete('missing')).rejects.toThrow(CustomError('Venue with id missing not found', ErrorTypes.NOT_FOUND));
    });

    it('wraps unknown errors', async () => {
      (VenueModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(VenueDAO.delete('venue-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
