import 'reflect-metadata';
import {VenueResolver} from '@/graphql/resolvers/venue';
import {VenueDAO} from '@/mongodb/dao';
import type {CreateVenueInput, QueryOptionsInput, UpdateVenueInput, Venue} from '@ntlango/commons/types';
import {VenueType} from '@ntlango/commons/types';
import * as validation from '@/validation';

jest.mock('@/mongodb/dao', () => ({
  VenueDAO: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    readVenueById: jest.fn(),
    readVenues: jest.fn(),
    readVenuesByOrgId: jest.fn(),
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

describe('VenueResolver', () => {
  let resolver: VenueResolver;

  const mockVenue: Venue = {
    venueId: 'venue-001',
    type: VenueType.Physical,
    name: 'Test Venue',
  };

  beforeEach(() => {
    resolver = new VenueResolver();
    jest.clearAllMocks();
    (validation.validateInput as jest.Mock).mockImplementation(() => undefined);
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => undefined);
  });

  describe('createVenue', () => {
    const createInput: CreateVenueInput = {
      type: VenueType.Physical,
      name: 'New Venue',
    };

    it('validates input and creates a venue', async () => {
      (VenueDAO.create as jest.Mock).mockResolvedValue(mockVenue);

      const result = await resolver.createVenue(createInput);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(VenueDAO.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(mockVenue);
    });
  });

  describe('updateVenue', () => {
    const updateInput: UpdateVenueInput = {
      venueId: mockVenue.venueId,
      name: 'Updated Venue',
    };

    it('validates and updates the venue', async () => {
      (VenueDAO.update as jest.Mock).mockResolvedValue({...mockVenue, name: 'Updated Venue'});

      const result = await resolver.updateVenue(updateInput);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(validation.validateMongodbId).toHaveBeenCalledWith(updateInput.venueId, expect.any(String));
      expect(VenueDAO.update).toHaveBeenCalledWith(updateInput);
      expect(result.name).toBe('Updated Venue');
    });
  });

  describe('deleteVenueById', () => {
    it('validates id and deletes the venue', async () => {
      (VenueDAO.delete as jest.Mock).mockResolvedValue(mockVenue);

      const result = await resolver.deleteVenueById(mockVenue.venueId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockVenue.venueId, expect.any(String));
      expect(VenueDAO.delete).toHaveBeenCalledWith(mockVenue.venueId);
      expect(result).toEqual(mockVenue);
    });
  });

  describe('readVenueById', () => {
    it('validates id and returns the venue', async () => {
      (VenueDAO.readVenueById as jest.Mock).mockResolvedValue(mockVenue);

      const result = await resolver.readVenueById(mockVenue.venueId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockVenue.venueId, expect.any(String));
      expect(VenueDAO.readVenueById).toHaveBeenCalledWith(mockVenue.venueId);
      expect(result).toEqual(mockVenue);
    });
  });

  describe('readVenues', () => {
    it('calls DAO with query options when provided', async () => {
      const options: QueryOptionsInput = {filters: []};
      (VenueDAO.readVenues as jest.Mock).mockResolvedValue([mockVenue]);

      const result = await resolver.readVenues(options);

      expect(VenueDAO.readVenues).toHaveBeenCalledWith(options);
      expect(result).toEqual([mockVenue]);
    });
  });

  describe('readVenuesByOrgId', () => {
    it('validates orgId and returns venues', async () => {
      (VenueDAO.readVenuesByOrgId as jest.Mock).mockResolvedValue([mockVenue]);
      const orgId = 'org-001';

      const result = await resolver.readVenuesByOrgId(orgId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(
        orgId,
        expect.stringContaining('Organization'),
      );
      expect(VenueDAO.readVenuesByOrgId).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([mockVenue]);
    });
  });
});
