import type { Venue } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';
import { VenueDAO } from '@/mongodb/dao';
import AuditLogService from './auditLog';

class VenueService {
  static async deleteById(venueId: string, actorId?: string, actorRole?: UserRole, ipAddress?: string): Promise<Venue> {
    const deleted = await VenueDAO.delete(venueId);
    if (actorId && actorRole) {
      AuditLogService.logVenueDeleted({
        actorId,
        actorRole,
        venueId: deleted.venueId,
        venueName: deleted.name,
        ipAddress,
      });
    }
    return deleted;
  }
}

export default VenueService;
