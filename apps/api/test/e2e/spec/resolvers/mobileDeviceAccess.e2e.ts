import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { MongoDbClient } from '@/clients';
import {
  GATHERLE_APP_VERSION_HEADER,
  GATHERLE_BUILD_VERSION_HEADER,
  GATHERLE_CLIENT_PLATFORM_HEADER,
  GATHERLE_CLIENT_PLATFORM_MOBILE,
  GATHERLE_DEVICE_INSTALLATION_ID_HEADER,
  MONGO_DB_URL,
} from '@/constants';
import MobileDeviceAccessRegistrationThrottleDAO from '@/mongodb/dao/mobileDeviceAccessRegistrationThrottle';
import { MobileDeviceAccess, MobileDeviceAccessRegistrationThrottle } from '@/mongodb/models';
import { getReadEventCategoriesQuery } from '@/test/utils';
import { readRuntimeContext } from '@/test/e2e/runtimeContext';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import {
  assertNoCleanupFailures,
  cleanupTrackedItems,
  trackCreatedId,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';
import { postGraphQLWithRetry } from '@/test/e2e/utils/userResolverHelpers';
import type { UserWithToken } from '@gatherle/commons/server/types';
import { MobileDeviceAccessPlatform, MobileDeviceAccessStatus } from '@gatherle/commons/server/types';
import { ERROR_MESSAGES } from '@/validation';

const MOBILE_APP_VERSION = '1.0.0-e2e';
const MOBILE_BUILD_VERSION = '100-e2e';
const ORPHANED_E2E_MOBILE_DEVICE_ACCESS_MIN_AGE_MS = 30 * 60 * 1000;

const getRegisterMobileDeviceAccessMutation = (deviceInstallationId: string) => ({
  query: `mutation RegisterMobileDeviceAccess($input: RegisterMobileDeviceAccessInput!) {
    registerMobileDeviceAccess(input: $input) {
      deviceInstallationId
      status
      platform
      appVersion
      buildVersion
    }
  }`,
  variables: {
    input: {
      appVersion: MOBILE_APP_VERSION,
      buildVersion: MOBILE_BUILD_VERSION,
      deviceInstallationId,
      platform: MobileDeviceAccessPlatform.Android,
    },
  },
});

const getRegisterMobileDeviceAccessWithSensitiveSelectionMutation = (deviceInstallationId: string) => ({
  query: `mutation RegisterMobileDeviceAccess($input: RegisterMobileDeviceAccessInput!) {
    registerMobileDeviceAccess(input: $input) {
      deviceInstallationId
      seenUserIds
      reviewedByUserId
    }
  }`,
  variables: {
    input: {
      appVersion: MOBILE_APP_VERSION,
      buildVersion: MOBILE_BUILD_VERSION,
      deviceInstallationId,
      platform: MobileDeviceAccessPlatform.Android,
    },
  },
});

const getUpdateMobileDeviceAccessStatusMutation = (deviceInstallationId: string, status: MobileDeviceAccessStatus) => ({
  query: `mutation UpdateMobileDeviceAccessStatus($input: UpdateMobileDeviceAccessStatusInput!) {
    updateMobileDeviceAccessStatus(input: $input) {
      deviceInstallationId
      status
      reviewedAt
    }
  }`,
  variables: {
    input: {
      deviceInstallationId,
      status,
    },
  },
});

const sendMobileGraphQL = async (url: string, payload: object, deviceInstallationId: string) =>
  request(url)
    .post('')
    .timeout({ response: 20_000, deadline: 30_000 })
    .set(GATHERLE_CLIENT_PLATFORM_HEADER, GATHERLE_CLIENT_PLATFORM_MOBILE)
    .set(GATHERLE_DEVICE_INSTALLATION_ID_HEADER, deviceInstallationId)
    .set(GATHERLE_APP_VERSION_HEADER, MOBILE_APP_VERSION)
    .set(GATHERLE_BUILD_VERSION_HEADER, MOBILE_BUILD_VERSION)
    .send(payload);

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
};

const resolveMongoDbUrlForE2E = async () => {
  const cachedMongoDbUrl = readRuntimeContext()?.mongoDbUrl?.trim();

  if (cachedMongoDbUrl) {
    return cachedMongoDbUrl;
  }

  const localMongoDbUrl = MONGO_DB_URL?.trim() || process.env.MONGO_DB_URL?.trim();

  if (localMongoDbUrl) {
    return localMongoDbUrl;
  }

  return undefined;
};

describe('Mobile Device Access Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const requiresDirectMongoCleanup = process.env.CI === 'true' && !new URL(url).hostname.includes('localhost');
  let adminUser: UserWithToken;
  let mongoConnected = false;
  let mongoCleanupUnavailableReason: string | null = null;
  let hasLoggedMongoCleanupSkip = false;
  const createdDeviceInstallationIds: string[] = [];

  const createTrackedDeviceInstallationId = () => {
    const deviceInstallationId = randomUUID();
    trackCreatedId(createdDeviceInstallationIds, deviceInstallationId);
    return deviceInstallationId;
  };

  const ensureMongoConnection = async () => {
    if (mongoConnected) {
      return;
    }

    if (mongoCleanupUnavailableReason) {
      throw new Error(mongoCleanupUnavailableReason);
    }

    const mongoDbUrl = await resolveMongoDbUrlForE2E();
    if (!mongoDbUrl) {
      mongoCleanupUnavailableReason =
        'MONGO_DB_URL is not configured for direct Mongo cleanup in mobileDeviceAccess.e2e.ts.';
      throw new Error(mongoCleanupUnavailableReason);
    }

    try {
      await MongoDbClient.connectToDatabase(mongoDbUrl);
      mongoConnected = true;
    } catch (error) {
      mongoCleanupUnavailableReason = describeError(error);
      throw error;
    }
  };

  const cleanupMobileDeviceAccessRecords = async (phase = 'cleanup') => {
    if (createdDeviceInstallationIds.length === 0) {
      return [];
    }

    try {
      await ensureMongoConnection();
    } catch (error) {
      if (requiresDirectMongoCleanup) {
        throw error;
      }

      if (!hasLoggedMongoCleanupSkip) {
        console.warn(
          `[mobileDeviceAccess.e2e] skipping ${phase} cleanup because direct Mongo access is unavailable: ${describeError(error)}`,
        );
        hasLoggedMongoCleanupSkip = true;
      }
      createdDeviceInstallationIds.length = 0;
      return [];
    }

    return cleanupTrackedItems({
      items: createdDeviceInstallationIds,
      itemId: (deviceInstallationId) => deviceInstallationId,
      label: 'mobile device access',
      phase,
      deleteItem: async (deviceInstallationId) => {
        const installationScopeKey =
          MobileDeviceAccessRegistrationThrottleDAO.buildDeviceInstallationScopeKey(deviceInstallationId);

        await Promise.all([
          MobileDeviceAccess.deleteMany({ deviceInstallationId }).exec(),
          MobileDeviceAccessRegistrationThrottle.deleteMany({ scopeKey: installationScopeKey }).exec(),
        ]);

        return { status: 200 };
      },
    });
  };

  const cleanupOrphanedMobileDeviceAccessRecords = async (phase = 'orphaned-e2e-mobile-device-access-cleanup') => {
    try {
      await ensureMongoConnection();
    } catch (error) {
      if (requiresDirectMongoCleanup) {
        throw error;
      }

      if (!hasLoggedMongoCleanupSkip) {
        console.warn(
          `[mobileDeviceAccess.e2e] skipping ${phase} cleanup because direct Mongo access is unavailable: ${describeError(error)}`,
        );
        hasLoggedMongoCleanupSkip = true;
      }
      return [];
    }

    const olderThan = new Date(Date.now() - ORPHANED_E2E_MOBILE_DEVICE_ACCESS_MIN_AGE_MS);
    const orphanedInstallations = (await MobileDeviceAccess.find({
      appVersion: MOBILE_APP_VERSION,
      buildVersion: MOBILE_BUILD_VERSION,
      updatedAt: { $lt: olderThan },
    })
      .select({ _id: 0, deviceInstallationId: 1 })
      .lean()
      .exec()) as Array<{ deviceInstallationId?: string }>;

    const orphanedDeviceInstallationIds = orphanedInstallations
      .map((installation) => installation.deviceInstallationId?.trim())
      .filter((deviceInstallationId): deviceInstallationId is string => Boolean(deviceInstallationId));

    if (orphanedDeviceInstallationIds.length === 0) {
      return [];
    }

    console.warn(
      `[${phase}] Cleaning up ${orphanedDeviceInstallationIds.length} orphaned API e2e mobile device access records`,
    );

    return cleanupTrackedItems({
      items: orphanedDeviceInstallationIds,
      itemId: (deviceInstallationId) => deviceInstallationId,
      label: 'mobile device access',
      phase,
      deleteItem: async (deviceInstallationId) => {
        const installationScopeKey =
          MobileDeviceAccessRegistrationThrottleDAO.buildDeviceInstallationScopeKey(deviceInstallationId);

        await Promise.all([
          MobileDeviceAccess.deleteMany({ deviceInstallationId }).exec(),
          MobileDeviceAccessRegistrationThrottle.deleteMany({ scopeKey: installationScopeKey }).exec(),
        ]);

        return { status: 200 };
      },
    });
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);

    if (requiresDirectMongoCleanup && !(await resolveMongoDbUrlForE2E())) {
      throw new Error(
        'MONGO_DB_URL is required for mobileDeviceAccess.e2e.ts cleanup in CI. Export it before running remote API e2e shards.',
      );
    }

    const orphanFailures = await cleanupOrphanedMobileDeviceAccessRecords(
      'beforeAll-orphaned-e2e-mobile-device-access-cleanup',
    );
    assertNoCleanupFailures(orphanFailures);
  });

  afterEach(async () => {
    const failures = await cleanupMobileDeviceAccessRecords();
    assertNoCleanupFailures(failures);
  });

  afterAll(async () => {
    const failures = await cleanupMobileDeviceAccessRecords('afterAll');
    if (mongoConnected) {
      await MongoDbClient.disconnectFromDatabase();
    }
    assertNoCleanupFailures(failures);
  });

  it('allows new mobile installations immediately while still registering them for admin tracking', async () => {
    const deviceInstallationId = createTrackedDeviceInstallationId();

    const registerResponse = await sendMobileGraphQL(
      url,
      getRegisterMobileDeviceAccessMutation(deviceInstallationId),
      deviceInstallationId,
    );

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.errors).toBeUndefined();
    expect(registerResponse.body.data.registerMobileDeviceAccess).toMatchObject({
      appVersion: MOBILE_APP_VERSION,
      buildVersion: MOBILE_BUILD_VERSION,
      deviceInstallationId,
      platform: MobileDeviceAccessPlatform.Android,
      status: MobileDeviceAccessStatus.Approved,
    });

    const accessResponse = await sendMobileGraphQL(url, getReadEventCategoriesQuery(), deviceInstallationId);

    expect(accessResponse.status).toBe(200);
    expect(accessResponse.body.errors).toBeUndefined();
    expect(Array.isArray(accessResponse.body.data.readEventCategories)).toBe(true);
  });

  it('blocks a mobile installation after an admin marks it as blocked', async () => {
    const deviceInstallationId = createTrackedDeviceInstallationId();

    const registerResponse = await sendMobileGraphQL(
      url,
      getRegisterMobileDeviceAccessMutation(deviceInstallationId),
      deviceInstallationId,
    );

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.errors).toBeUndefined();

    const blockResponse = await postGraphQLWithRetry(
      url,
      getUpdateMobileDeviceAccessStatusMutation(deviceInstallationId, MobileDeviceAccessStatus.Blocked),
      adminUser.token,
    );

    expect(blockResponse.status).toBe(200);
    expect(blockResponse.body.errors).toBeUndefined();
    expect(blockResponse.body.data.updateMobileDeviceAccessStatus.status).toBe(MobileDeviceAccessStatus.Blocked);

    const blockedAccessResponse = await sendMobileGraphQL(url, getReadEventCategoriesQuery(), deviceInstallationId);

    expect(blockedAccessResponse.status).toBe(403);
    expect(blockedAccessResponse.body.errors?.[0]?.extensions?.code).toBe('DEVICE_ACCESS_DENIED');
    expect(blockedAccessResponse.body.errors?.[0]?.extensions?.mobileDeviceAccessStatus).toBe(
      MobileDeviceAccessStatus.Blocked,
    );
    expect(blockedAccessResponse.body.errors?.[0]?.message).toContain('blocked');
  });

  it('does not expose admin-only device metadata through the public registration mutation', async () => {
    const deviceInstallationId = createTrackedDeviceInstallationId();

    const response = await sendMobileGraphQL(
      url,
      getRegisterMobileDeviceAccessWithSensitiveSelectionMutation(deviceInstallationId),
      deviceInstallationId,
    );

    expect(response.status).toBe(400);
    expect(response.body.errors?.[0]?.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(response.body.errors?.[0]?.message).toBe(ERROR_MESSAGES.INVALID_QUERY);
  });
});
