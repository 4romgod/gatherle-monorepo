import { AWS_REGION, STAGE } from '@/constants';

export const AUTH_ABUSE_METRIC_NAMESPACE = 'Gatherle/AuthAbuse';
const AUTH_ABUSE_METRIC_DIMENSIONS = ['Stage', 'Region'] as const;

type AuthAbuseMetricName = 'LoginFailure' | 'LoginLockout';

export function emitAuthAbuseMetric(metricName: AuthAbuseMetricName, count = 1): void {
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: AUTH_ABUSE_METRIC_NAMESPACE,
            Dimensions: [AUTH_ABUSE_METRIC_DIMENSIONS],
            Metrics: [{ Name: metricName, Unit: 'Count' }],
          },
        ],
      },
      Stage: STAGE,
      Region: AWS_REGION,
      [metricName]: count,
    }),
  );
}
