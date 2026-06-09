import { AWS_REGION, GATHERLE_CLIENT_PLATFORM_MOBILE, INVALID_GRAPHQL_REQUEST_OPERATION, STAGE } from '@/constants';
import type { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';

export const MOBILE_DEVICE_ACCESS_METRIC_NAMESPACE = 'Gatherle/MobileAccess';
const MOBILE_DEVICE_ACCESS_METRIC_DIMENSIONS = ['Stage', 'Region'] as const;

type MobileDeviceAccessMetricName =
  | 'InstallationRegistration'
  | 'InstallationHeartbeat'
  | 'ApprovedInstallationRequest'
  | 'PendingInstallationRequest'
  | 'BlockedInstallationRequest'
  | 'AuthenticatedInstallationRequest'
  | 'BlockedUserRequest';

type EmitMobileDeviceAccessMetricsInput = {
  appVersion?: string;
  buildVersion?: string;
  clientPlatform?: string;
  deviceInstallationId?: string;
  metrics: Partial<Record<MobileDeviceAccessMetricName, number>>;
  operation?: string;
  status?: MobileDeviceAccessStatus | 'BlockedUser';
  userId?: string;
};

export function emitMobileDeviceAccessMetrics({
  appVersion,
  buildVersion,
  clientPlatform,
  deviceInstallationId,
  metrics,
  operation,
  status,
  userId,
}: EmitMobileDeviceAccessMetricsInput): void {
  const metricEntries = Object.entries(metrics).reduce<Array<[MobileDeviceAccessMetricName, number]>>(
    (entries, [name, value]) => {
      if (typeof value === 'number' && value > 0) {
        entries.push([name as MobileDeviceAccessMetricName, value]);
      }

      return entries;
    },
    [],
  );

  if (metricEntries.length === 0) {
    return;
  }

  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: MOBILE_DEVICE_ACCESS_METRIC_NAMESPACE,
            Dimensions: [MOBILE_DEVICE_ACCESS_METRIC_DIMENSIONS],
            Metrics: metricEntries.map(([name]) => ({ Name: name, Unit: 'Count' })),
          },
        ],
      },
      Stage: STAGE,
      Region: AWS_REGION,
      ClientPlatform: clientPlatform ?? GATHERLE_CLIENT_PLATFORM_MOBILE,
      DeviceInstallationId: deviceInstallationId,
      AppVersion: appVersion,
      BuildVersion: buildVersion,
      Operation: operation ?? INVALID_GRAPHQL_REQUEST_OPERATION,
      InstallationStatus: status,
      UserId: userId,
      ...Object.fromEntries(metricEntries),
    }),
  );
}
