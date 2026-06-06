import { GraphQLError } from 'graphql';
import type {
  PushSubscription as PushSubscriptionEntity,
  RegisterPushSubscriptionInput,
} from '@gatherle/commons/server/types';
import { PushSubscriptionPlatform, PushSubscriptionProvider } from '@gatherle/commons/server/types';
import { PushSubscription as PushSubscriptionModel } from '@/mongodb/models';
import { KnownCommonError, logDaoError } from '@/utils';

const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

function readSubscriptionFreshnessTimestamp(
  subscription: Pick<PushSubscriptionEntity, 'createdAt' | 'lastRegisteredAt' | 'updatedAt'>,
): number {
  return (
    subscription.lastRegisteredAt?.getTime?.() ??
    subscription.updatedAt?.getTime?.() ??
    subscription.createdAt?.getTime?.() ??
    0
  );
}

function resolvePushProvider(input: RegisterPushSubscriptionInput): PushSubscriptionProvider {
  if (input.provider) {
    return input.provider;
  }

  if (EXPO_PUSH_TOKEN_REGEX.test(input.token)) {
    return PushSubscriptionProvider.Expo;
  }

  if (input.platform === PushSubscriptionPlatform.Android) {
    return PushSubscriptionProvider.Fcm;
  }

  return PushSubscriptionProvider.Expo;
}

class PushSubscriptionDAO {
  static async register(userId: string, input: RegisterPushSubscriptionInput): Promise<PushSubscriptionEntity> {
    const { deviceInstallationId, platform, token } = input;
    const provider = resolvePushProvider(input);

    try {
      await PushSubscriptionModel.updateMany(
        {
          userId,
          deviceInstallationId,
          isActive: true,
          token: { $ne: token },
        },
        {
          isActive: false,
        },
      ).exec();

      const existingSubscription = await PushSubscriptionModel.findOne({ token }).exec();
      if (existingSubscription) {
        existingSubscription.userId = userId;
        existingSubscription.provider = provider;
        existingSubscription.platform = platform;
        existingSubscription.deviceInstallationId = deviceInstallationId;
        existingSubscription.isActive = true;
        existingSubscription.lastRegisteredAt = new Date();
        await existingSubscription.save();
        await PushSubscriptionModel.updateMany(
          {
            _id: { $ne: existingSubscription._id },
            isActive: true,
            $or: [{ token }, { userId, deviceInstallationId }],
          },
          {
            isActive: false,
          },
        ).exec();
        return existingSubscription.toObject();
      }

      const createdSubscription = await PushSubscriptionModel.create({
        userId,
        provider,
        platform,
        token,
        deviceInstallationId,
        isActive: true,
        lastRegisteredAt: new Date(),
      });

      await PushSubscriptionModel.updateMany(
        {
          _id: { $ne: createdSubscription._id },
          isActive: true,
          $or: [{ token }, { userId, deviceInstallationId }],
        },
        {
          isActive: false,
        },
      ).exec();

      return createdSubscription.toObject();
    } catch (error) {
      logDaoError('Error registering push subscription', { error, userId, token });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deactivateForUser(userId: string, token: string): Promise<boolean> {
    try {
      const result = await PushSubscriptionModel.updateOne(
        {
          userId,
          token,
          isActive: true,
        },
        {
          isActive: false,
        },
      ).exec();

      return result.modifiedCount > 0;
    } catch (error) {
      logDaoError('Error deactivating push subscription for user', { error, userId, token });
      throw KnownCommonError(error);
    }
  }

  static async deactivateByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    try {
      await PushSubscriptionModel.updateMany(
        {
          token: { $in: tokens },
        },
        {
          isActive: false,
        },
      ).exec();
    } catch (error) {
      logDaoError('Error deactivating push subscriptions by token', { error, tokens });
      throw KnownCommonError(error);
    }
  }

  static async readActiveByUserIds(userIds: string[]): Promise<PushSubscriptionEntity[]> {
    if (userIds.length === 0) {
      return [];
    }

    try {
      const subscriptions = await PushSubscriptionModel.find({
        userId: { $in: userIds },
        isActive: true,
      }).exec();

      const sortedSubscriptions = [...subscriptions].sort(
        (left, right) => readSubscriptionFreshnessTimestamp(right) - readSubscriptionFreshnessTimestamp(left),
      );
      const duplicateIds: Array<unknown> = [];
      const seenDeviceKeys = new Set<string>();
      const seenTokens = new Set<string>();
      const uniqueSubscriptions = sortedSubscriptions.filter((subscription) => {
        const deviceKey = `${subscription.userId}::${subscription.deviceInstallationId}`;
        const tokenKey = subscription.token.trim();

        if (seenDeviceKeys.has(deviceKey) || seenTokens.has(tokenKey)) {
          duplicateIds.push(subscription._id);
          return false;
        }

        seenDeviceKeys.add(deviceKey);
        seenTokens.add(tokenKey);
        return true;
      });

      if (duplicateIds.length > 0) {
        await PushSubscriptionModel.updateMany(
          {
            _id: { $in: duplicateIds },
          },
          {
            isActive: false,
          },
        ).exec();
      }

      return uniqueSubscriptions.map((subscription) => subscription.toObject());
    } catch (error) {
      logDaoError('Error reading active push subscriptions', { error, userIds });
      throw KnownCommonError(error);
    }
  }

  static async markDelivered(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    try {
      await PushSubscriptionModel.updateMany(
        {
          token: { $in: tokens },
        },
        {
          lastDeliveredAt: new Date(),
        },
      ).exec();
    } catch (error) {
      logDaoError('Error marking push subscriptions delivered', { error, tokens });
      throw KnownCommonError(error);
    }
  }

  static async deleteByUserId(userId: string): Promise<void> {
    try {
      await PushSubscriptionModel.deleteMany({ userId }).exec();
    } catch (error) {
      logDaoError('Error deleting push subscriptions for user', { error, userId });
      throw KnownCommonError(error);
    }
  }
}

export default PushSubscriptionDAO;
