import { createOrganizationLoader } from '@/graphql/loaders';
import { Organization as OrganizationModel } from '@/mongodb/models';
import type { Organization } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  Organization: {
    find: jest.fn(),
  },
}));

describe('OrganizationLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should batch load organizations by ID', async () => {
    const mockOrganizations: Array<Partial<Organization> & { _id: string }> = [
      {
        _id: 'org1',
        orgId: 'org1',
        slug: 'test-org-1',
        name: 'Test Organization 1',
        description: 'Description 1',
      },
      {
        _id: 'org2',
        orgId: 'org2',
        slug: 'test-org-2',
        name: 'Test Organization 2',
        description: 'Description 2',
      },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockOrganizations),
    };

    (OrganizationModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createOrganizationLoader();

    // Load multiple organizations
    const results = await Promise.all([loader.load('org1'), loader.load('org2'), loader.load('org3')]);

    // Should make single batch query
    expect(OrganizationModel.find).toHaveBeenCalledTimes(1);
    expect(OrganizationModel.find).toHaveBeenCalledWith({ _id: { $in: ['org1', 'org2', 'org3'] } });

    // Should return results in correct order
    expect(results[0]).toEqual(mockOrganizations[0]);
    expect(results[1]).toEqual(mockOrganizations[1]);
    expect(results[2]).toBeNull(); // org3 not found
  });

  it('should handle empty input', async () => {
    const loader = createOrganizationLoader();
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
  });

  it('should deduplicate IDs in batch', async () => {
    const mockOrganizations: Array<Partial<Organization> & { _id: string }> = [
      {
        _id: 'org1',
        orgId: 'org1',
        slug: 'test-org-1',
        name: 'Test Organization 1',
      },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockOrganizations),
    };

    (OrganizationModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createOrganizationLoader();

    // Load same organization multiple times
    const results = await Promise.all([loader.load('org1'), loader.load('org1'), loader.load('org1')]);

    // Should deduplicate and make single query
    expect(OrganizationModel.find).toHaveBeenCalledTimes(1);
    expect(OrganizationModel.find).toHaveBeenCalledWith({ _id: { $in: ['org1'] } });

    // All results should be the same organization
    expect(results[0]).toEqual(mockOrganizations[0]);
    expect(results[1]).toEqual(mockOrganizations[0]);
    expect(results[2]).toEqual(mockOrganizations[0]);
  });

  it('should handle database errors gracefully', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    };

    (OrganizationModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createOrganizationLoader();

    await expect(loader.load('org1')).rejects.toThrow('Database error');
  });

  it('should cache loaded organizations', async () => {
    const mockOrganizations: Array<Partial<Organization> & { _id: string }> = [
      {
        _id: 'org1',
        orgId: 'org1',
        slug: 'test-org-1',
        name: 'Test Organization 1',
      },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockOrganizations),
    };

    (OrganizationModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createOrganizationLoader();

    // Load organization twice
    await loader.load('org1');
    await loader.load('org1');

    // Should only make one database query (second is cached)
    expect(OrganizationModel.find).toHaveBeenCalledTimes(1);
  });

  it('should handle mixed found and not-found organizations', async () => {
    const mockOrganizations: Array<Partial<Organization> & { _id: string }> = [
      {
        _id: 'org1',
        orgId: 'org1',
        slug: 'test-org-1',
        name: 'Test Organization 1',
      },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockOrganizations),
    };

    (OrganizationModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createOrganizationLoader();

    const results = await Promise.all([loader.load('org1'), loader.load('nonexistent1'), loader.load('nonexistent2')]);

    expect(results[0]).toEqual(mockOrganizations[0]);
    expect(results[1]).toBeNull();
    expect(results[2]).toBeNull();
  });
});
