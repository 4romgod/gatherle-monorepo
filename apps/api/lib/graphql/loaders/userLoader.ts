import DataLoader from 'dataloader';
import {User as UserModel} from '@/mongodb/models';
import type {User} from '@ntlango/commons/types';
import {logger} from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching User lookups by ID.
 * Eliminates N+1 queries when resolving nested user references (organizers, participants, etc.).
 */
export const createUserLoader = () =>
  new DataLoader<string, User | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`UserLoader batching ${uniqueKeys.length} user IDs`);

      const users = await UserModel.find({_id: {$in: uniqueKeys}})
        .lean()
        .exec();

      const userMap = new Map<string, User>(users.map((u) => [u._id.toString(), u as User]));

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => userMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
