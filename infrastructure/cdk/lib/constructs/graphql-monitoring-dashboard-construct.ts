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
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface GraphqlMonitoringDashboardConstructProps {
  stageName: string;
  awsRegion: string;
  targetSuffix: string;
  graphqlLambdaFunction: IFunction;
  graphqlLambdaLogGroup: ILogGroup;
  graphqlApiAccessLogGroup: ILogGroup;
  occurrenceMaintenanceLambdaFunction: IFunction;
  occurrenceMaintenanceLambdaLogGroup: ILogGroup;
}

const OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE = 'Gatherle/EventOccurrenceMaintenance';

export class GraphqlMonitoringDashboardConstruct extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: GraphqlMonitoringDashboardConstructProps) {
    super(scope, id);

    const {
      stageName,
      awsRegion,
      targetSuffix,
      graphqlLambdaFunction,
      graphqlLambdaLogGroup,
      graphqlApiAccessLogGroup,
      occurrenceMaintenanceLambdaFunction,
      occurrenceMaintenanceLambdaLogGroup,
    } = props;

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
        title: '🔴 Error Logs',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, error.name as errorName, error.message as errorMessage, message',
          'filter level = "ERROR"',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 8,
      }),
      new LogQueryWidget({
        title: '⚠️ Warning Logs',
        logGroupNames: [graphqlLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, error.name as errorName, error.message as errorMessage, message',
          'filter level = "WARN"',
          'sort @timestamp desc',
          'limit 100',
        ],
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
        markdown: '## GraphQL Operations',
        width: 24,
        height: 1,
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
        markdown: '## Error Patterns',
        width: 24,
        height: 1,
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
      metric: occurrenceMaintenanceLambdaFunction.metricErrors({
        statistic: 'Sum',
        period: Duration.hours(6),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when the scheduled occurrence maintenance Lambda errors.',
    });

    const missingOccurrencesAlarm = new Alarm(this, 'OccurrenceMaintenanceMissingOccurrencesAlarm', {
      metric: occurrenceMaintenanceMetric('RemainingMissingSeriesCount', 'Missing series remaining'),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when event series still have missing occurrences after maintenance.',
    });

    const lowHorizonAlarm = new Alarm(this, 'OccurrenceMaintenanceLowHorizonAlarm', {
      metric: occurrenceMaintenanceMetric('RemainingLowHorizonSeriesCount', 'Low-horizon series remaining'),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when recurring series remain below the maintenance horizon after a maintenance run.',
    });

    const driftAlarm = new Alarm(this, 'OccurrenceMaintenanceDriftAlarm', {
      metric: occurrenceMaintenanceMetric('RemainingDriftedOccurrenceCount', 'Drifted occurrences remaining'),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Alert when reserved-slot counters remain out of sync with occurrence participants after maintenance.',
    });

    const maintenanceSuccessMissingAlarm = new Alarm(this, 'OccurrenceMaintenanceMissingSuccessAlarm', {
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
      alarmDescription: 'Alert when no successful occurrence maintenance run is recorded in the last 24 hours.',
    });

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
          'fields @timestamp, level, message, context.error.message as errorMessage, context',
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
        left: [graphqlLambdaFunction.metricInvocations({ statistic: 'Sum', period: Duration.seconds(60) })],
        width: 12,
        height: 6,
      }),
    );
  }
}
