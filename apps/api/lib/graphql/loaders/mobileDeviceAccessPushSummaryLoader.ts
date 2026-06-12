import DataLoader from 'dataloader';
import type { MobileDeviceAccessPushSummary } from '@gatherle/commons/server/types';
import { MobileDeviceAccessDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

export const createMobileDeviceAccessPushSummaryLoader = () =>
  new DataLoader<string, MobileDeviceAccessPushSummary>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((key) => key.toString().trim()).filter(Boolean)));
      logger.debug(`MobileDeviceAccessPushSummaryLoader batching ${uniqueKeys.length} installation IDs`);

      const summaryMap = await MobileDeviceAccessDAO.readPushSummariesByDeviceInstallationIds(uniqueKeys);

      return keys.map((key) => {
        const deviceInstallationId = key.toString().trim();
        return (
          summaryMap.get(deviceInstallationId) ?? {
            hasActiveSubscription: false,
            activeSubscriptionCount: 0,
            providers: [],
          }
        );
      });
    },
    {
      cacheKeyFn: (key) => key.toString(),
    },
  );
