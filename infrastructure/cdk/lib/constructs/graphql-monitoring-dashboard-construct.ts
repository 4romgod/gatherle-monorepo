import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
  Alarm,
  AlarmWidget,
  ComparisonOperator,
  Dashboard,
  GraphWidget,
  LogQueryVisualizationType,
  LogQueryWidget,
  Metric,
  TextWidget,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {
  DEFAULT_AUTH_FAILURE_ALARM_THRESHOLDS,
  DEFAULT_AUTH_LOCKOUT_ALARM_THRESHOLDS,
  DEFAULT_GRAPHQL_API_CLIENT_ERROR_ALARM_THRESHOLDS,
  DEFAULT_GRAPHQL_API_SERVER_ERROR_ALARM_THRESHOLDS,
  DEFAULT_GRAPHQL_API_THROTTLE_ALARM_THRESHOLDS,
  DEFAULT_OCCURRENCE_DRIFT_ALARM_THRESHOLDS,
  DEFAULT_OCCURRENCE_LOW_HORIZON_ALARM_THRESHOLDS,
  DEFAULT_OCCURRENCE_MISSING_SERIES_ALARM_THRESHOLDS,
  DEFAULT_GRAPHQL_QUERY_GUARD_REJECTION_ALARM_THRESHOLDS,
} from '../constants';

export interface GraphqlMonitoringDashboardConstructProps {
  stageName: string;
  awsRegion: string;
  targetSuffix: string;
  graphqlApi: RestApi;
  graphqlLambdaFunction: IFunction;
  graphqlLambdaLogGroup: ILogGroup;
  graphqlApiAccessLogGroup: ILogGroup;
  occurrenceMaintenanceLambdaFunction: IFunction;
  occurrenceMaintenanceLambdaLogGroup: ILogGroup;
  alertTopic?: ITopic;
}

const OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE = 'Gatherle/EventOccurrenceMaintenance';
const GRAPHQL_QUERY_GUARD_METRIC_NAMESPACE = 'Gatherle/GraphQLQueryGuards';
const AUTH_ABUSE_METRIC_NAMESPACE = 'Gatherle/AuthAbuse';
const MOBILE_DEVICE_ACCESS_METRIC_NAMESPACE = 'Gatherle/MobileAccess';
const SYNTHETIC_OPERATION_PREFIX = 'Synthetic';

function scopedAlarmName(baseName: string, targetSuffix: string): string {
  return `${baseName}-${targetSuffix}`;
}

export class GraphqlMonitoringDashboardConstruct extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: GraphqlMonitoringDashboardConstructProps) {
    super(scope, id);

    const {
      stageName,
      awsRegion,
      targetSuffix,
      graphqlApi,
      graphqlLambdaFunction,
      graphqlLambdaLogGroup,
      graphqlApiAccessLogGroup,
      occurrenceMaintenanceLambdaFunction,
      occurrenceMaintenanceLambdaLogGroup,
      alertTopic,
    } = props;

    const alertAction = alertTopic ? new SnsAction(alertTopic) : undefined;
    const attachAlarmAction = (...alarms: Alarm[]) => {
      if (!alertAction) {
        return;
      }

      alarms.forEach((alarm) => {
        alarm.addAlarmAction(alertAction);
      });
    };

    const occurrenceMaintenanceMetric = (
      metricName: string,
      label: string,
      color?: string,
      period: Duration = Duration.hours(6),
    ) =>
      new Metric({
        namespace: OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE,
        metricName,
        label,
        color,
        statistic: 'Maximum',
        period,
        dimensionsMap: {
          Stage: stageName,
          Region: awsRegion,
          Service: 'OccurrenceMaintenance',
        },
      });

    const queryGuardMetric = (
      metricName: string,
      label: string,
      statistic: string,
      color?: string,
      period: Duration = Duration.minutes(5),
    ) =>
      new Metric({
        namespace: GRAPHQL_QUERY_GUARD_METRIC_NAMESPACE,
        metricName,
        label,
        color,
        statistic,
        period,
        dimensionsMap: {
          Stage: stageName,
          Region: awsRegion,
        },
      });

    const authAbuseMetric = (
      metricName: 'LoginFailure' | 'LoginLockout',
      label: string,
      color?: string,
      period: Duration = Duration.minutes(5),
    ) =>
      new Metric({
        namespace: AUTH_ABUSE_METRIC_NAMESPACE,
        metricName,
        label,
        color,
        statistic: 'Sum',
        period,
        dimensionsMap: {
          Stage: stageName,
          Region: awsRegion,
        },
      });

    const mobileAccessMetric = (
      metricName:
        | 'InstallationRegistration'
        | 'InstallationHeartbeat'
        | 'ApprovedInstallationRequest'
        | 'PendingInstallationRequest'
        | 'BlockedInstallationRequest'
        | 'AuthenticatedInstallationRequest'
        | 'BlockedUserRequest',
      label: string,
      color?: string,
      period: Duration = Duration.minutes(5),
    ) =>
      new Metric({
        namespace: MOBILE_DEVICE_ACCESS_METRIC_NAMESPACE,
        metricName,
        label,
        color,
        statistic: 'Sum',
        period,
        dimensionsMap: {
          Stage: stageName,
          Region: awsRegion,
        },
      });

    const runtimeAwareErrorQueryLines = [
      'fields @timestamp, coalesce(context.message, error.message, context.errorMessage) as errorMessage, message, error.name as errorName, @message',
      'filter level = "ERROR" or @message like /Task timed out/ or @message like /Process exited before completing request/ or @message like /Runtime\\./ or @message like /Unhandled/',
      'sort @timestamp desc',
      'limit 100',
    ];

    const warningQueryLines = [
      'fields @timestamp, coalesce(context.message, error.message, context.errorMessage) as errorMessage, message, error.name as errorName, @message',
      'filter level = "WARN"',
      'sort @timestamp desc',
      'limit 100',
    ];

    const hasSyntheticOperationQueryLine = `filter operation not like /^${SYNTHETIC_OPERATION_PREFIX}/`;
    const hasSyntheticMetricOperationQueryLine = `filter Operation not like /^${SYNTHETIC_OPERATION_PREFIX}/`;

    this.dashboard = new Dashboard(this, 'GatherleGraphqlDashboard', {
      dashboardName: `Gatherle-GraphQL-${targetSuffix}`,
    });

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: `# Gatherle GraphQL Monitoring Dashboard\n\n**Stage:** ${stageName}\n**Lambda Function:** ${graphqlLambdaFunction.functionName}`,
        width: 24,
        height: 2,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Lambda Invocations',
        left: [graphqlLambdaFunction.metricInvocations({ statistic: 'Sum' })],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Errors',
        left: [graphqlLambdaFunction.metricErrors({ statistic: 'Sum', color: '#d62728' })],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Duration (P50, P95, P99)',
        left: [
          graphqlLambdaFunction.metricDuration({ statistic: 'p50', label: 'P50' }),
          graphqlLambdaFunction.metricDuration({
            statistic: 'p95',
            label: 'P95',
            color: '#ff7f0e',
          }),
          graphqlLambdaFunction.metricDuration({ statistic: 'p99', label: 'P99', color: '#d62728' }),
        ],
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Application Errors & Warnings',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: '🔴 Application and Runtime Errors',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        queryLines: runtimeAwareErrorQueryLines,
        width: 12,
        height: 8,
      }),
      new LogQueryWidget({
        title: '⚠️ Warning Logs',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        queryLines: warningQueryLines,
        width: 12,
        height: 8,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Request Performance',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Cold Starts Detected',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp',
          'filter @type = "REPORT"',
          'filter @message like /Init Duration/',
          'stats count() as coldStarts by bin(5m)',
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Throttles',
        left: [graphqlLambdaFunction.metricThrottles({ statistic: 'Sum', label: 'Throttled Requests' })],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown:
          '## GraphQL Operations\n\nTables in this section focus on product traffic. Synthetic test probes are excluded so the leaderboard reflects real web and mobile usage patterns.',
        width: 24,
        height: 2,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Top Operations',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields context.operation as operation',
          'filter level = "INFO" and message = "GraphQL request received"',
          'filter ispresent(operation)',
          hasSyntheticOperationQueryLine,
          'stats count() as requests by operation',
          'sort requests desc',
          'limit 15',
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Operations with Errors',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields context.operation as operation',
          'filter (level = "ERROR" or level = "WARN") and ispresent(operation)',
          hasSyntheticOperationQueryLine,
          'stats count() as errors by operation',
          'sort errors desc',
          'limit 15',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Query Guard Metrics',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Auth Abuse Signals',
        left: [
          authAbuseMetric('LoginFailure', 'Login failures', '#ff7f0e'),
          authAbuseMetric('LoginLockout', 'Login lockouts', '#d62728'),
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'Query Complexity (Avg, P95, Max)',
        left: [
          queryGuardMetric('QueryComplexity', 'Average complexity', 'Average'),
          queryGuardMetric('QueryComplexity', 'P95 complexity', 'p95', '#ff7f0e'),
          queryGuardMetric('QueryComplexity', 'Max complexity', 'Maximum', '#d62728'),
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'Query Depth (Avg, P95, Max)',
        left: [
          queryGuardMetric('QueryDepth', 'Average depth', 'Average'),
          queryGuardMetric('QueryDepth', 'P95 depth', 'p95', '#17becf'),
          queryGuardMetric('QueryDepth', 'Max depth', 'Maximum', '#9467bd'),
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'GraphQL API Error Signals',
        leftYAxis: {
          label: 'HTTP transport errors / throttles',
          showUnits: false,
        },
        left: [
          graphqlApi.metricClientError({ statistic: 'Sum', period: Duration.minutes(5), label: '4xx' }),
          graphqlApi.metricServerError({
            statistic: 'Sum',
            period: Duration.minutes(5),
            label: '5xx',
            color: '#d62728',
          }),
          graphqlApi.metric('ThrottleCount', {
            statistic: 'Sum',
            period: Duration.minutes(5),
            label: 'ThrottleCount',
            color: '#9467bd',
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Query Guard Outcomes',
        left: [
          queryGuardMetric('QueryGuardAccepted', 'Accepted queries', 'Sum', '#2ca02c'),
          queryGuardMetric('QueryGuardRejected', 'Rejected queries', 'Sum', '#d62728'),
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'High-Complexity Operations',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields Operation, OperationType, QueryComplexity, QueryDepth',
          'filter ispresent(QueryComplexity) and ispresent(Operation)',
          hasSyntheticMetricOperationQueryLine,
          'stats max(QueryComplexity) as maxComplexity, avg(QueryComplexity) as avgComplexity, max(QueryDepth) as maxDepth by Operation, OperationType',
          'sort maxComplexity desc',
          'limit 15',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Mobile Access & Usage',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Mobile Install Registrations',
        left: [
          mobileAccessMetric('InstallationRegistration', 'First-seen installs', '#2ca02c'),
          mobileAccessMetric('InstallationHeartbeat', 'Install heartbeats', '#1f77b4'),
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'Mobile Access Gate Outcomes',
        left: [
          mobileAccessMetric('ApprovedInstallationRequest', 'Approved requests', '#2ca02c'),
          mobileAccessMetric('PendingInstallationRequest', 'Pending requests', '#ff7f0e'),
          mobileAccessMetric('BlockedInstallationRequest', 'Blocked installs', '#d62728'),
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Authenticated Mobile Usage',
        left: [
          mobileAccessMetric('AuthenticatedInstallationRequest', 'Authenticated mobile requests', '#17becf'),
          mobileAccessMetric('BlockedUserRequest', 'Blocked account requests', '#d62728'),
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Mobile Install Versions',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields AppVersion, BuildVersion, ClientPlatform, InstallationRegistration',
          'filter ispresent(InstallationRegistration) and InstallationRegistration > 0',
          'stats sum(InstallationRegistration) as installs by AppVersion, BuildVersion, ClientPlatform',
          'sort installs desc',
          'limit 20',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Recent Blocked Mobile Access',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields @timestamp, Operation, DeviceInstallationId, InstallationStatus, UserId, AppVersion, BuildVersion',
          'filter (ispresent(BlockedInstallationRequest) and BlockedInstallationRequest > 0) or (ispresent(BlockedUserRequest) and BlockedUserRequest > 0)',
          'sort @timestamp desc',
          'limit 50',
        ],
        width: 24,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown:
          '## Error Patterns\n\nThis breakdown mixes GraphQL application error families and raw runtime exception classes.\n\n- `GraphQLError`: typed API responses such as auth failures, not-found, conflicts, bad input, and query-guard rejections.\n- `MongoServerError`: database execution or duplicate-key failures that escaped translation.\n- `ValidationError`: model/schema validation failures before persistence.\n- `AccessDeniedException`: AWS permission or integration configuration issue.\n- `OperationResolutionError` / `SyntaxError`: malformed GraphQL documents sent by a client or synthetic probe.\n- `Error`: uncategorized runtime failure that needs investigation.',
        width: 24,
        height: 4,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Error Types Distribution',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.PIE,
        queryLines: [
          'fields error.name as errorType',
          'filter (level = "WARN" or level = "ERROR") and ispresent(errorType)',
          'stats count() as count by errorType',
        ],
        width: 24,
        height: 6,
      }),
    );

    const maintenanceFailureAlarm = new Alarm(this, 'OccurrenceMaintenanceFailureAlarm', {
      alarmName: scopedAlarmName('OccurrenceMaintenanceRunFailure', targetSuffix),
      metric: occurrenceMaintenanceLambdaFunction.metricErrors({
        statistic: 'Sum',
        period: Duration.hours(6),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when the scheduled event occurrence maintenance Lambda records one or more execution errors during a 6-hour maintenance window.',
    });

    const graphqlApiClientErrorAlarm = new Alarm(this, 'GraphqlApiClientErrorAlarm', {
      alarmName: scopedAlarmName('GraphqlApi4xxSpike', targetSuffix),
      metric: graphqlApi.metricClientError({ statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: DEFAULT_GRAPHQL_API_CLIENT_ERROR_ALARM_THRESHOLDS[stageName] ?? 150,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when GraphQL 4xx responses stay elevated for at least 2 of 3 consecutive 5-minute periods, signalling sustained client breakage, abuse, or an unhealthy rollout rather than isolated bad requests.',
    });

    const graphqlApiServerErrorAlarm = new Alarm(this, 'GraphqlApiServerErrorAlarm', {
      alarmName: scopedAlarmName('GraphqlApi5xxSpike', targetSuffix),
      metric: graphqlApi.metricServerError({ statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: DEFAULT_GRAPHQL_API_SERVER_ERROR_ALARM_THRESHOLDS[stageName] ?? 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when GraphQL 5xx responses stay elevated for at least 2 of 3 consecutive 5-minute periods, indicating a sustained server-side failure rather than a single transient burst.',
    });

    const graphqlApiThrottleAlarm = new Alarm(this, 'GraphqlApiThrottleAlarm', {
      alarmName: scopedAlarmName('GraphqlApiThrottleSpike', targetSuffix),
      metric: graphqlApi.metric('ThrottleCount', { statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: DEFAULT_GRAPHQL_API_THROTTLE_ALARM_THRESHOLDS[stageName] ?? 3,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when API Gateway throttles GraphQL requests in a 5-minute window, indicating traffic that is outpacing configured capacity or a misconfigured client burst.',
    });

    const graphqlQueryGuardRejectionAlarm = new Alarm(this, 'GraphqlQueryGuardRejectionAlarm', {
      alarmName: scopedAlarmName('GraphqlQueryGuardRejections', targetSuffix),
      metric: queryGuardMetric('QueryGuardRejected', 'Rejected queries', 'Sum'),
      threshold: DEFAULT_GRAPHQL_QUERY_GUARD_REJECTION_ALARM_THRESHOLDS[stageName] ?? 20,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when GraphQL complexity/depth guards reject an unusual volume of requests across 2 of 3 consecutive 5-minute periods, which usually points to probing, abuse, or a broken client query shape.',
    });

    const authFailureAlarm = new Alarm(this, 'GraphqlAuthFailureAlarm', {
      alarmName: scopedAlarmName('GraphqlLoginFailureSpike', targetSuffix),
      metric: authAbuseMetric('LoginFailure', 'Login failures'),
      threshold: DEFAULT_AUTH_FAILURE_ALARM_THRESHOLDS[stageName] ?? 25,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when login failures remain elevated across 2 of 3 consecutive 5-minute periods, which is a stronger signal for credential stuffing or login UX breakage than one-off invalid passwords.',
    });

    const authLockoutAlarm = new Alarm(this, 'GraphqlAuthLockoutAlarm', {
      alarmName: scopedAlarmName('GraphqlLoginLockouts', targetSuffix),
      metric: authAbuseMetric('LoginLockout', 'Login lockouts'),
      threshold: DEFAULT_AUTH_LOCKOUT_ALARM_THRESHOLDS[stageName] ?? 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when account lockouts are recorded in 2 of 3 consecutive 5-minute periods, signalling sustained brute-force pressure rather than isolated user mistakes.',
    });

    const missingOccurrencesAlarm = new Alarm(this, 'OccurrenceMaintenanceMissingOccurrencesAlarm', {
      alarmName: scopedAlarmName('OccurrenceMaintenanceMissingSeries', targetSuffix),
      metric: occurrenceMaintenanceMetric('RemainingMissingSeriesCount', 'Missing series remaining'),
      threshold: DEFAULT_OCCURRENCE_MISSING_SERIES_ALARM_THRESHOLDS[stageName] ?? 10,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when a maintenance run still leaves a meaningful backlog of event series without persisted occurrences. This is intended to catch operational drift, not single-series noise.',
    });

    const lowHorizonAlarm = new Alarm(this, 'OccurrenceMaintenanceLowHorizonAlarm', {
      alarmName: scopedAlarmName('OccurrenceMaintenanceLowHorizon', targetSuffix),
      metric: occurrenceMaintenanceMetric('RemainingLowHorizonSeriesCount', 'Low-horizon series remaining'),
      threshold: DEFAULT_OCCURRENCE_LOW_HORIZON_ALARM_THRESHOLDS[stageName] ?? 10,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when a maintenance run still leaves a meaningful backlog of recurring series whose persisted occurrence window falls below the configured horizon.',
    });

    const driftAlarm = new Alarm(this, 'OccurrenceMaintenanceDriftAlarm', {
      alarmName: scopedAlarmName('OccurrenceMaintenanceDrift', targetSuffix),
      metric: occurrenceMaintenanceMetric('RemainingDriftedOccurrenceCount', 'Drifted occurrences remaining'),
      threshold: DEFAULT_OCCURRENCE_DRIFT_ALARM_THRESHOLDS[stageName] ?? 25,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when a maintenance run still leaves a meaningful backlog of occurrences whose reserved-slot counters remain out of sync with participant state after reconciliation.',
    });

    const maintenanceSuccessMissingAlarm = new Alarm(this, 'OccurrenceMaintenanceMissingSuccessAlarm', {
      alarmName: scopedAlarmName('OccurrenceMaintenanceMissingSuccess', targetSuffix),
      metric: occurrenceMaintenanceMetric(
        'MaintenanceRunSuccess',
        'Successful maintenance runs',
        undefined,
        Duration.days(1),
      ),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING,
      alarmDescription:
        'Triggers when no successful occurrence maintenance run is recorded in the last 24 hours, indicating the scheduled worker may be failing to run at all.',
    });

    attachAlarmAction(
      maintenanceFailureAlarm,
      graphqlApiClientErrorAlarm,
      graphqlApiServerErrorAlarm,
      graphqlApiThrottleAlarm,
      graphqlQueryGuardRejectionAlarm,
      authFailureAlarm,
      authLockoutAlarm,
      missingOccurrencesAlarm,
      lowHorizonAlarm,
      driftAlarm,
      maintenanceSuccessMissingAlarm,
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown:
          '## Security Alarms\n\nThese alarms are tuned for sustained spikes, not ordinary product traffic. Client 4xxs, login failures, and query-guard rejections must stay elevated before an alarm opens.',
        width: 24,
        height: 2,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'GraphQL API 4xx Spike',
        alarm: graphqlApiClientErrorAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'GraphQL API 5xx Spike',
        alarm: graphqlApiServerErrorAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'GraphQL API Throttles',
        alarm: graphqlApiThrottleAlarm,
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'Query Guard Rejections',
        alarm: graphqlQueryGuardRejectionAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'Login Failure Spike',
        alarm: authFailureAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'Login Lockouts',
        alarm: authLockoutAlarm,
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Event Occurrence Maintenance',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Occurrence Maintenance Lambda',
        left: [
          occurrenceMaintenanceLambdaFunction.metricInvocations({ statistic: 'Sum', label: 'Invocations' }),
          occurrenceMaintenanceLambdaFunction.metricErrors({
            statistic: 'Sum',
            label: 'Errors',
            color: '#d62728',
          }),
        ],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Occurrence Maintenance Duration (P50, P95)',
        left: [
          occurrenceMaintenanceLambdaFunction.metricDuration({ statistic: 'p50', label: 'P50' }),
          occurrenceMaintenanceLambdaFunction.metricDuration({
            statistic: 'p95',
            label: 'P95',
            color: '#ff7f0e',
          }),
        ],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Occurrence Maintenance Throughput',
        left: [
          occurrenceMaintenanceMetric('ProcessedSeriesCount', 'Processed series'),
          occurrenceMaintenanceMetric('SyncedSeriesCount', 'Synced series', '#2ca02c'),
          occurrenceMaintenanceMetric('ReconciledOccurrenceCount', 'Reconciled drift', '#9467bd'),
        ],
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Occurrence Maintenance Health',
        left: [
          occurrenceMaintenanceMetric('RemainingMissingSeriesCount', 'Missing series remaining', '#d62728'),
          occurrenceMaintenanceMetric('RemainingLowHorizonSeriesCount', 'Low-horizon series remaining', '#ff7f0e'),
          occurrenceMaintenanceMetric('RemainingMetadataRepairSeriesCount', 'Metadata repairs remaining', '#1f77b4'),
          occurrenceMaintenanceMetric('RemainingDriftedOccurrenceCount', 'Drifted occurrences remaining', '#9467bd'),
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Occurrence Maintenance Logs',
        logGroupNames: [occurrenceMaintenanceLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, level, message, error.name as errorName, error.message as errorMessage, context',
          'filter ispresent(level) or ispresent(message)',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'Occurrence Maintenance Lambda Failures',
        alarm: maintenanceFailureAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'Missing Occurrence Series Remaining',
        alarm: missingOccurrencesAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'Low-Horizon Series Remaining',
        alarm: lowHorizonAlarm,
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'Occurrence/Participant Drift Remaining',
        alarm: driftAlarm,
        width: 12,
        height: 6,
      }),
      new AlarmWidget({
        title: 'Missing Successful Maintenance Run',
        alarm: maintenanceSuccessMissingAlarm,
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## API Gateway Metrics',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Request Rate (Requests per 5 minutes)',
        logGroupNames: [graphqlApiAccessLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: ['fields @timestamp', 'stats count() as requestCount by bin(5m)'],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Response Status Codes',
        logGroupNames: [graphqlApiAccessLogGroup.logGroupName],
        view: LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields @timestamp, @message',
          'parse @message /"\\s+(?<status>\\d{3})\\s+(?<bytes>\\d+)/',
          'filter ispresent(status)',
          'stats count() as count by status',
          'sort count desc',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Response Size Distribution (bytes)',
        logGroupNames: [graphqlApiAccessLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp',
          'parse @message /"\\s+(?<status>\\d{3})\\s+(?<bytes>\\d+)/',
          'filter ispresent(bytes)',
          'stats avg(bytes) as avgBytes, max(bytes) as maxBytes, min(bytes) as minBytes by bin(5m)',
        ],
        width: 12,
        height: 6,
      }),
      new GraphWidget({
        title: 'Concurrent Executions',
        left: [
          graphqlLambdaFunction.metric('ConcurrentExecutions', {
            statistic: 'Maximum',
            period: Duration.minutes(5),
            label: 'Concurrent executions',
          }),
        ],
        width: 12,
        height: 6,
      }),
    );
  }
}
