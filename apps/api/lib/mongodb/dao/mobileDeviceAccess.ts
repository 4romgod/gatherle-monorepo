import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';
import type {
  MobileDeviceAccess as MobileDeviceAccessEntity,
  ReadMobileDeviceAccessesInput,
  RegisterMobileDeviceAccessInput,
  UpdateMobileDeviceAccessStatusInput,
} from '@gatherle/commons/server/types';
import { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';
import { MobileDeviceAccess as MobileDeviceAccessModel } from '@/mongodb/models';
import { emitMobileDeviceAccessMetrics, CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';

const AUTHENTICATED_USE_HEARTBEAT_WINDOW_MS = 15 * 60 * 1000;
export type RegisterMobileDeviceAccessResult = {
  deviceAccess: MobileDeviceAccessEntity;
  registrationSecret: string;
};

class MobileDeviceAccessDAO {
  static async register(input: RegisterMobileDeviceAccessInput): Promise<RegisterMobileDeviceAccessResult> {
    const now = new Date();
    const nextAppVersion = input.appVersion?.trim() || undefined;
    const nextBuildVersion = input.buildVersion?.trim() || undefined;
    const providedRegistrationSecret = input.registrationSecret?.trim() || undefined;

    try {
      const existingDeviceAccess = await MobileDeviceAccessModel.findOne({
        deviceInstallationId: input.deviceInstallationId,
      }).exec();

      if (existingDeviceAccess) {
        const persistedRegistrationSecret = existingDeviceAccess.registrationSecret?.trim();
        const nextRegistrationSecret = persistedRegistrationSecret || randomUUID();

        if (persistedRegistrationSecret && providedRegistrationSecret !== persistedRegistrationSecret) {
          throw CustomError(
            'This installation heartbeat is not authorized. Reopen the app from the original install or contact an admin.',
            ErrorTypes.UNAUTHORIZED,
          );
        }

        existingDeviceAccess.registrationSecret = nextRegistrationSecret;
        existingDeviceAccess.platform = input.platform;
        existingDeviceAccess.appVersion = nextAppVersion;
        existingDeviceAccess.buildVersion = nextBuildVersion;
        existingDeviceAccess.lastSeenAt = now;
        if (existingDeviceAccess.status === MobileDeviceAccessStatus.Pending) {
          existingDeviceAccess.status = MobileDeviceAccessStatus.Approved;
        }
        await existingDeviceAccess.save();
        emitMobileDeviceAccessMetrics({
          appVersion: nextAppVersion,
          buildVersion: nextBuildVersion,
          deviceInstallationId: input.deviceInstallationId,
          metrics: {
            InstallationHeartbeat: 1,
          },
          status: existingDeviceAccess.status,
        });
        return {
          deviceAccess: existingDeviceAccess.toObject(),
          registrationSecret: nextRegistrationSecret,
        };
      }

      const registrationSecret = randomUUID();
      const createdDeviceAccess = await MobileDeviceAccessModel.create({
        deviceInstallationId: input.deviceInstallationId,
        platform: input.platform,
        appVersion: nextAppVersion,
        buildVersion: nextBuildVersion,
        firstSeenAt: now,
        lastSeenAt: now,
        registrationSecret,
        status: MobileDeviceAccessStatus.Approved,
      });

      emitMobileDeviceAccessMetrics({
        appVersion: nextAppVersion,
        buildVersion: nextBuildVersion,
        deviceInstallationId: input.deviceInstallationId,
        metrics: {
          InstallationHeartbeat: 1,
          InstallationRegistration: 1,
        },
        status: createdDeviceAccess.status,
      });

      return {
        deviceAccess: createdDeviceAccess.toObject(),
        registrationSecret,
      };
    } catch (error) {
      logDaoError('Error registering mobile device access', {
        error,
        deviceInstallationId: input.deviceInstallationId,
      });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByDeviceInstallationId(deviceInstallationId: string): Promise<MobileDeviceAccessEntity | null> {
    try {
      const deviceAccess = await MobileDeviceAccessModel.findOne({ deviceInstallationId }).exec();
      return deviceAccess ? deviceAccess.toObject() : null;
    } catch (error) {
      logDaoError('Error reading mobile device access by installation ID', { error, deviceInstallationId });
      throw KnownCommonError(error);
    }
  }

  static async readMany(input: ReadMobileDeviceAccessesInput = {}): Promise<MobileDeviceAccessEntity[]> {
    const searchValue = input.search?.trim();
    const filters: Record<string, unknown> = {};

    if (input.status) {
      filters.status = input.status;
    }

    if (searchValue) {
      filters.$or = [
        { deviceInstallationId: { $regex: searchValue, $options: 'i' } },
        { appVersion: { $regex: searchValue, $options: 'i' } },
        { buildVersion: { $regex: searchValue, $options: 'i' } },
        { lastSeenUserId: { $regex: searchValue, $options: 'i' } },
        { seenUserIds: { $regex: searchValue, $options: 'i' } },
      ];
    }

    try {
      const deviceAccessRecords = await MobileDeviceAccessModel.find(filters)
        .sort({ lastSeenAt: -1, createdAt: -1 })
        .exec();

      return deviceAccessRecords.map((deviceAccess) => deviceAccess.toObject());
    } catch (error) {
      logDaoError('Error reading mobile device access records', { error, filters });
      throw KnownCommonError(error);
    }
  }

  static async updateStatus(
    input: UpdateMobileDeviceAccessStatusInput,
    reviewedByUserId: string,
  ): Promise<MobileDeviceAccessEntity> {
    try {
      const deviceAccess = await MobileDeviceAccessModel.findOne({
        deviceInstallationId: input.deviceInstallationId,
      }).exec();

      if (!deviceAccess) {
        throw CustomError(`Mobile device ${input.deviceInstallationId} does not exist.`, ErrorTypes.NOT_FOUND);
      }

      deviceAccess.status = input.status;
      deviceAccess.reviewedAt = new Date();
      deviceAccess.reviewedByUserId = reviewedByUserId;
      await deviceAccess.save();

      return deviceAccess.toObject();
    } catch (error) {
      logDaoError('Error updating mobile device access status', {
        error,
        deviceInstallationId: input.deviceInstallationId,
        reviewedByUserId,
        status: input.status,
      });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async recordAuthenticatedUse(input: {
    appVersion?: string;
    buildVersion?: string;
    deviceInstallationId: string;
    userId: string;
  }): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTHENTICATED_USE_HEARTBEAT_WINDOW_MS);
    const nextAppVersion = input.appVersion?.trim() || undefined;
    const nextBuildVersion = input.buildVersion?.trim() || undefined;

    try {
      await MobileDeviceAccessModel.updateOne(
        {
          deviceInstallationId: input.deviceInstallationId,
          $or: [
            { lastSeenUserId: { $ne: input.userId } },
            { lastAuthenticatedAt: { $exists: false } },
            { lastAuthenticatedAt: { $lt: cutoff } },
            ...(nextAppVersion ? [{ appVersion: { $ne: nextAppVersion } }] : []),
            ...(nextBuildVersion ? [{ buildVersion: { $ne: nextBuildVersion } }] : []),
          ],
        },
        {
          $addToSet: {
            seenUserIds: input.userId,
          },
          $set: {
            ...(nextAppVersion ? { appVersion: nextAppVersion } : {}),
            ...(nextBuildVersion ? { buildVersion: nextBuildVersion } : {}),
            lastAuthenticatedAt: now,
            lastSeenAt: now,
            lastSeenUserId: input.userId,
          },
        },
      ).exec();
    } catch (error) {
      logDaoError('Error recording authenticated mobile installation use', {
        error,
        deviceInstallationId: input.deviceInstallationId,
        userId: input.userId,
      });
      throw KnownCommonError(error);
    }
  }
}

export default MobileDeviceAccessDAO;
