import 'reflect-metadata';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import {
  CreateSupportRequestInput,
  MediaEntityType,
  ReadSupportRequestsInput,
  SupportRequest,
  UpdateSupportRequestStatusInput,
  UserRole,
} from '@gatherle/commons/server/types';
import { SUPPORT_REQUEST_LIMITS, SUPPORT_REQUEST_SCREENSHOT_MAX_MB } from '@gatherle/commons/server/constants';
import { getKeyFromPublicUrl, getS3ObjectSize } from '@/clients/AWS/s3Client';
import { SupportRequestDAO } from '@/mongodb/dao';
import { MEDIA_ENTITY_FOLDER, RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';
import { CustomError, ErrorTypes, getAuthenticatedUser } from '@/utils';
import { validateInput } from '@/validation';
import {
  CreateSupportRequestInputSchema,
  ReadSupportRequestsInputSchema,
  UpdateSupportRequestStatusInputSchema,
} from '@/validation/zod';

const SUPPORT_REQUEST_MEDIA_FOLDER = MEDIA_ENTITY_FOLDER[MediaEntityType.SupportRequest];

function isMissingS3ObjectError(error: unknown): boolean {
  const maybeAwsError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return maybeAwsError.name === 'NotFound' || maybeAwsError.$metadata?.httpStatusCode === 404;
}

async function verifySupportRequestScreenshot(screenshotUrl?: string): Promise<void> {
  if (!screenshotUrl) {
    return;
  }

  const screenshotKey = getKeyFromPublicUrl(screenshotUrl);
  if (!screenshotKey || !SUPPORT_REQUEST_MEDIA_FOLDER || !screenshotKey.includes(`/${SUPPORT_REQUEST_MEDIA_FOLDER}/`)) {
    throw CustomError('Screenshot upload is invalid. Please attach the screenshot again.', ErrorTypes.BAD_USER_INPUT);
  }

  let screenshotSize: number | undefined;
  try {
    screenshotSize = await getS3ObjectSize(screenshotKey);
  } catch (error) {
    if (isMissingS3ObjectError(error)) {
      throw CustomError('Uploaded screenshot was not found. Please attach it again.', ErrorTypes.BAD_USER_INPUT);
    }

    throw error;
  }

  if (screenshotSize == null) {
    throw CustomError('Uploaded screenshot could not be verified. Please attach it again.', ErrorTypes.BAD_USER_INPUT);
  }

  if (screenshotSize > SUPPORT_REQUEST_LIMITS.screenshotMaxBytes) {
    throw CustomError(
      `Screenshot must be ${SUPPORT_REQUEST_SCREENSHOT_MAX_MB} MB or smaller.`,
      ErrorTypes.BAD_USER_INPUT,
    );
  }
}

@Resolver(() => SupportRequest)
export class SupportRequestResolver {
  @Authorized([UserRole.Admin])
  @Query(() => [SupportRequest], { description: RESOLVER_DESCRIPTIONS.SUPPORT_REQUEST.readSupportRequests })
  async readSupportRequests(
    @Arg('input', () => ReadSupportRequestsInput, { nullable: true }) input?: ReadSupportRequestsInput,
  ): Promise<SupportRequest[]> {
    const resolvedInput = input ?? {};
    validateInput(ReadSupportRequestsInputSchema, resolvedInput);
    return SupportRequestDAO.readMany(resolvedInput);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => SupportRequest, { description: RESOLVER_DESCRIPTIONS.SUPPORT_REQUEST.createSupportRequest })
  async createSupportRequest(
    @Arg('input', () => CreateSupportRequestInput) input: CreateSupportRequestInput,
    @Ctx() context: ServerContext,
  ): Promise<SupportRequest> {
    validateInput(CreateSupportRequestInputSchema, input);

    const requester = getAuthenticatedUser(context);
    const platform = context.mobileDeviceAccess?.clientPlatform ?? 'web';
    const appVersion = context.mobileDeviceAccess?.appVersion;
    const buildVersion = context.mobileDeviceAccess?.buildVersion;
    const userAgentHeader = context.req?.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    await verifySupportRequestScreenshot(input.screenshotUrl);

    return SupportRequestDAO.create({
      appVersion,
      buildVersion,
      input,
      platform,
      requesterEmail: requester.email,
      requesterUserId: requester.userId,
      userAgent,
    });
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => SupportRequest, { description: RESOLVER_DESCRIPTIONS.SUPPORT_REQUEST.updateSupportRequestStatus })
  async updateSupportRequestStatus(
    @Arg('input', () => UpdateSupportRequestStatusInput) input: UpdateSupportRequestStatusInput,
  ): Promise<SupportRequest> {
    validateInput(UpdateSupportRequestStatusInputSchema, input);
    return SupportRequestDAO.updateStatus(input);
  }
}
