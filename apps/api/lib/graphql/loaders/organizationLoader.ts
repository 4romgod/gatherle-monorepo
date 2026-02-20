import DataLoader from 'dataloader';
import { Organization as OrganizationModel } from '@/mongodb/models';
import type { Organization } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching Organization lookups by ID.
 * Eliminates N+1 queries when resolving nested organization references (event organizers, follows, etc.).
 */
export const createOrganizationLoader = () =>
  new DataLoader<string, Organization | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`OrganizationLoader batching ${uniqueKeys.length} organization IDs`);

      const organizations = await OrganizationModel.find({ _id: { $in: uniqueKeys } })
        .lean()
        .exec();

      const orgMap = new Map<string, Organization>(organizations.map((o) => [o._id.toString(), o as Organization]));

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => orgMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
