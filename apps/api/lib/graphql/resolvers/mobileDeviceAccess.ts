import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  ReadMobileDeviceAccessesInputSchema,
  RegisterMobileDeviceAccessInputSchema,
  UpdateMobileDeviceAccessStatusInputSchema,
} from '@gatherle/commons/server/validation';
import {
  MobileDeviceAccess,
  MobileDeviceAccessPushSummary,
  MobileDeviceAccessRegistrationResult,
  ReadMobileDeviceAccessesInput,
  RegisterMobileDeviceAccessInput,
  UpdateMobileDeviceAccessStatusInput,
  User,
  UserRole,
} from '@gatherle/commons/server/types';
import { MobileDeviceAccessDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import MobileDeviceAccessRegistrationThrottleDAO, {
  type MobileDeviceAccessRegistrationRateLimitConfig,
} from '@/mongodb/dao/mobileDeviceAccessRegistrationThrottle';
import { getAuthenticatedUser, getRequestIpFromContext } from '@/utils';
import { validateInput } from '@/validation';

const MOBILE_DEVICE_ACCESS_REGISTRATION_WINDOW_MS = 15 * 60 * 1000;
const MOBILE_DEVICE_ACCESS_INSTALLATION_RATE_LIMIT: MobileDeviceAccessRegistrationRateLimitConfig = {
  maxRequests: 24,
  windowMs: MOBILE_DEVICE_ACCESS_REGISTRATION_WINDOW_MS,
};
const MOBILE_DEVICE_ACCESS_IP_RATE_LIMIT: MobileDeviceAccessRegistrationRateLimitConfig = {
  maxRequests: 120,
  windowMs: MOBILE_DEVICE_ACCESS_REGISTRATION_WINDOW_MS,
};

@Resolver(() => MobileDeviceAccess)
export class MobileDeviceAccessResolver {
  @Mutation(() => MobileDeviceAccessRegistrationResult, {
    description: 'Register or refresh a native mobile installation so Gatherle can track and control app access.',
  })
  async registerMobileDeviceAccess(
    @Arg('input', () => RegisterMobileDeviceAccessInput) input: RegisterMobileDeviceAccessInput,
    @Ctx() context: ServerContext,
  ): Promise<MobileDeviceAccessRegistrationResult> {
    validateInput(RegisterMobileDeviceAccessInputSchema, input);

    const now = new Date();
    await MobileDeviceAccessRegistrationThrottleDAO.assertAllowed(
      MobileDeviceAccessRegistrationThrottleDAO.buildDeviceInstallationScopeKey(input.deviceInstallationId),
      MOBILE_DEVICE_ACCESS_INSTALLATION_RATE_LIMIT,
      now,
    );

    const requestIp = getRequestIpFromContext(context);
    if (requestIp) {
      await MobileDeviceAccessRegistrationThrottleDAO.assertAllowed(
        MobileDeviceAccessRegistrationThrottleDAO.buildIpScopeKey(requestIp),
        MOBILE_DEVICE_ACCESS_IP_RATE_LIMIT,
        now,
      );
    }

    const { deviceAccess, registrationSecret } = await MobileDeviceAccessDAO.register(input);
    return {
      appVersion: deviceAccess.appVersion,
      buildVersion: deviceAccess.buildVersion,
      deviceInstallationId: deviceAccess.deviceInstallationId,
      platform: deviceAccess.platform,
      registrationSecret,
      status: deviceAccess.status,
    };
  }

  @Authorized([UserRole.Admin])
  @Query(() => [MobileDeviceAccess], {
    description: 'Read native mobile installation access records for admin access management.',
  })
  async readMobileDeviceAccesses(
    @Arg('input', () => ReadMobileDeviceAccessesInput, { nullable: true }) input?: ReadMobileDeviceAccessesInput,
  ): Promise<MobileDeviceAccess[]> {
    validateInput(ReadMobileDeviceAccessesInputSchema, input ?? {});
    return MobileDeviceAccessDAO.readMany(input ?? {});
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => MobileDeviceAccess, {
    description: 'Update the access state for a native mobile installation.',
  })
  async updateMobileDeviceAccessStatus(
    @Arg('input', () => UpdateMobileDeviceAccessStatusInput) input: UpdateMobileDeviceAccessStatusInput,
    @Ctx() context: ServerContext,
  ): Promise<MobileDeviceAccess> {
    validateInput(UpdateMobileDeviceAccessStatusInputSchema, input);
    const user = getAuthenticatedUser(context);
    return MobileDeviceAccessDAO.updateStatus(input, user.userId);
  }

  @Authorized([UserRole.Admin])
  @FieldResolver(() => User, {
    nullable: true,
    description: 'Most recent signed-in user observed on this installation.',
  })
  async lastSeenUser(
    @Root() mobileDeviceAccess: MobileDeviceAccess,
    @Ctx() context: ServerContext,
  ): Promise<User | null> {
    const lastSeenUserId = mobileDeviceAccess.lastSeenUserId?.trim();
    if (!lastSeenUserId) {
      return null;
    }

    return context.loaders.user.load(lastSeenUserId);
  }

  @Authorized([UserRole.Admin])
  @FieldResolver(() => [User], {
    nullable: true,
    description: 'Distinct signed-in users observed on this installation.',
  })
  async seenUsers(@Root() mobileDeviceAccess: MobileDeviceAccess, @Ctx() context: ServerContext): Promise<User[]> {
    const seenUserIds = Array.from(
      new Set((mobileDeviceAccess.seenUserIds ?? []).map((userId) => userId.trim())),
    ).filter(Boolean);

    if (seenUserIds.length === 0) {
      return [];
    }

    const users = await Promise.all(seenUserIds.map((userId) => context.loaders.user.load(userId)));
    return users.filter((user): user is User => Boolean(user));
  }

  @Authorized([UserRole.Admin])
  @FieldResolver(() => MobileDeviceAccessPushSummary, {
    description: 'Current push delivery summary for this installation.',
  })
  async pushSummary(
    @Root() mobileDeviceAccess: MobileDeviceAccess,
    @Ctx() context: ServerContext,
  ): Promise<MobileDeviceAccessPushSummary> {
    return context.loaders.mobileDeviceAccessPushSummary.load(mobileDeviceAccess.deviceInstallationId);
  }
}
