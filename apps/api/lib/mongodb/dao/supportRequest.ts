import type {
  CreateSupportRequestInput,
  ReadSupportRequestsInput,
  SupportRequest as SupportRequestEntity,
  UpdateSupportRequestStatusInput,
} from '@gatherle/commons/server/types';
import { SupportRequestStatus } from '@gatherle/commons/server/types';
import { SupportRequest as SupportRequestModel } from '@/mongodb/models';
import { buildTextSearchRegex } from '@/utils/queries/text-search';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';

type CreateSupportRequestParams = {
  appVersion?: string;
  buildVersion?: string;
  input: CreateSupportRequestInput;
  platform?: string;
  requesterEmail: string;
  requesterUserId: string;
  userAgent?: string;
};

const normalizeOptionalString = (value?: string | null): string | undefined => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
};

class SupportRequestDAO {
  static async create({
    appVersion,
    buildVersion,
    input,
    platform,
    requesterEmail,
    requesterUserId,
    userAgent,
  }: CreateSupportRequestParams): Promise<SupportRequestEntity> {
    try {
      const supportRequest = await SupportRequestModel.create({
        appVersion: normalizeOptionalString(appVersion),
        buildVersion: normalizeOptionalString(buildVersion),
        kind: input.kind,
        message: input.message.trim(),
        pagePath: normalizeOptionalString(input.pagePath),
        platform: normalizeOptionalString(platform),
        requesterEmail: requesterEmail.trim().toLowerCase(),
        requesterUserId,
        screenshotUrl: normalizeOptionalString(input.screenshotUrl),
        status: SupportRequestStatus.Open,
        subject: input.subject.trim(),
        userAgent: normalizeOptionalString(userAgent),
      });

      return supportRequest.toObject();
    } catch (error) {
      logDaoError('Error creating support request', {
        error,
        kind: input.kind,
        requesterUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async readMany(input: ReadSupportRequestsInput = {}): Promise<SupportRequestEntity[]> {
    const trimmedSearch = normalizeOptionalString(input.search);
    const limit = input.limit ?? 100;
    const filters: Record<string, unknown> = {};

    if (input.status) {
      filters.status = input.status;
    }

    if (trimmedSearch) {
      const searchRegex = buildTextSearchRegex(trimmedSearch);
      filters.$or = [
        { requesterEmail: { $regex: searchRegex } },
        { subject: { $regex: searchRegex } },
        { message: { $regex: searchRegex } },
        { pagePath: { $regex: searchRegex } },
      ];
    }

    try {
      const supportRequests = await SupportRequestModel.find(filters).sort({ createdAt: -1 }).limit(limit).exec();
      return supportRequests.map((supportRequest) => supportRequest.toObject());
    } catch (error) {
      logDaoError('Error reading support requests', { error, filters, limit });
      throw KnownCommonError(error);
    }
  }

  static async updateStatus(input: UpdateSupportRequestStatusInput): Promise<SupportRequestEntity> {
    try {
      const supportRequest = await SupportRequestModel.findById(input.supportRequestId).exec();

      if (!supportRequest) {
        throw CustomError('Support request not found.', ErrorTypes.NOT_FOUND);
      }

      supportRequest.status = input.status;
      await supportRequest.save();
      return supportRequest.toObject();
    } catch (error) {
      logDaoError('Error updating support request status', {
        error,
        supportRequestId: input.supportRequestId,
        status: input.status,
      });
      throw KnownCommonError(error);
    }
  }
}

export default SupportRequestDAO;
