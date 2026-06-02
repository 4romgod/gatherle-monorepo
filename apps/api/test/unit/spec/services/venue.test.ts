jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
}));

jest.mock('@/mongodb/dao', () => ({
  VenueDAO: {
    delete: jest.fn(),
  },
}));

jest.mock('@/services/auditLog', () => ({
  __esModule: true,
  default: {
    logVenueDeleted: jest.fn(),
  },
}));

import VenueService from '@/services/venue';
import { VenueDAO } from '@/mongodb/dao';
import AuditLogService from '@/services/auditLog';
import type { Venue } from '@gatherle/commons/types';
import { UserRole, VenueType } from '@gatherle/commons/types';

describe('VenueService', () => {
  const mockVenue: Venue = {
    venueId: 'venue-1',
    name: 'Test Venue',
    type: VenueType.Physical,
    slug: 'test-venue',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteById', () => {
    it('deletes the venue via the DAO and returns it', async () => {
      (VenueDAO.delete as jest.Mock).mockResolvedValue(mockVenue);

      const result = await VenueService.deleteById('venue-1');

      expect(VenueDAO.delete).toHaveBeenCalledWith('venue-1');
      expect(result).toEqual(mockVenue);
    });

    it('fires audit log when actor params are provided', async () => {
      (VenueDAO.delete as jest.Mock).mockResolvedValue(mockVenue);

      await VenueService.deleteById('venue-1', 'actor-1', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logVenueDeleted).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorRole: UserRole.Admin,
        venueId: mockVenue.venueId,
        venueName: mockVenue.name,
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actor params are absent', async () => {
      (VenueDAO.delete as jest.Mock).mockResolvedValue(mockVenue);

      await VenueService.deleteById('venue-1');

      expect(AuditLogService.logVenueDeleted).not.toHaveBeenCalled();
    });

    it('does not fire audit log when actorId is provided but actorRole is missing', async () => {
      (VenueDAO.delete as jest.Mock).mockResolvedValue(mockVenue);

      await VenueService.deleteById('venue-1', 'actor-1');

      expect(AuditLogService.logVenueDeleted).not.toHaveBeenCalled();
    });
  });
});
