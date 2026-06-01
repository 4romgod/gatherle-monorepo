import { AWS_REGION, INVALID_GRAPHQL_REQUEST_OPERATION, STAGE, UNKNOWN_GRAPHQL_OPERATION_TYPE } from '@/constants';

export const GRAPHQL_QUERY_GUARD_METRIC_NAMESPACE = 'Gatherle/GraphQLQueryGuards';
const GRAPHQL_QUERY_GUARD_METRIC_DIMENSIONS = ['Stage', 'Region'] as const;

type GraphqlQueryGuardMetricName = 'QueryComplexity' | 'QueryDepth' | 'QueryGuardAccepted' | 'QueryGuardRejected';

type EmitGraphqlQueryGuardMetricsInput = {
  operation?: string;
  operationType?: string;
  complexity: number;
  depth: number;
  accepted: boolean;
};

export function emitGraphqlQueryGuardMetrics({
  operation,
  operationType,
  complexity,
  depth,
  accepted,
}: EmitGraphqlQueryGuardMetricsInput): void {
  const metrics: Record<GraphqlQueryGuardMetricName, number> = {
    QueryComplexity: complexity,
    QueryDepth: depth,
    QueryGuardAccepted: accepted ? 1 : 0,
    QueryGuardRejected: accepted ? 0 : 1,
  };

  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: GRAPHQL_QUERY_GUARD_METRIC_NAMESPACE,
            Dimensions: [GRAPHQL_QUERY_GUARD_METRIC_DIMENSIONS],
            Metrics: [
              { Name: 'QueryComplexity', Unit: 'Count' },
              { Name: 'QueryDepth', Unit: 'Count' },
              { Name: 'QueryGuardAccepted', Unit: 'Count' },
              { Name: 'QueryGuardRejected', Unit: 'Count' },
            ],
          },
        ],
      },
      Stage: STAGE,
      Region: AWS_REGION,
      Operation: operation ?? INVALID_GRAPHQL_REQUEST_OPERATION,
      OperationType: operationType ?? UNKNOWN_GRAPHQL_OPERATION_TYPE,
      ...metrics,
    }),
  );
}
