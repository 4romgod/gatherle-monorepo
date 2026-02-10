import { Stack, StackProps, Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {
  Dashboard,
  GraphWidget,
  LogQueryWidget,
  TextWidget,
  LogQueryVisualizationType,
} from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { APPLICATION_STAGES } from '@ntlango/commons';

export interface MonitoringDashboardStackProps extends StackProps {
  lambdaFunction: IFunction;
  lambdaLogGroup: ILogGroup;
  apiAccessLogGroup: ILogGroup;
}

export class MonitoringDashboardStack extends Stack {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringDashboardStackProps) {
    super(scope, id, props);

    const { lambdaFunction, lambdaLogGroup, apiAccessLogGroup } = props;

    this.dashboard = new Dashboard(this, 'NtlangoApiDashboard', {
      dashboardName: `Ntlango-API-${process.env.STAGE || APPLICATION_STAGES.BETA}`,
    });

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: `# Ntlango API Monitoring Dashboard\n\n**Stage:** ${process.env.STAGE || APPLICATION_STAGES.BETA}\n**Lambda Function:** ${lambdaFunction.functionName}`,
        width: 24,
        height: 2,
      }),
    );

    // ============================================
    // Row 1: Lambda Function Metrics
    // ============================================
    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Lambda Invocations',
        left: [lambdaFunction.metricInvocations({ statistic: 'Sum' })],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Errors',
        left: [lambdaFunction.metricErrors({ statistic: 'Sum', color: '#d62728' })],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Duration (P50, P95, P99)',
        left: [
          lambdaFunction.metricDuration({ statistic: 'p50', label: 'P50' }),
          lambdaFunction.metricDuration({ statistic: 'p95', label: 'P95', color: '#ff7f0e' }),
          lambdaFunction.metricDuration({ statistic: 'p99', label: 'P99', color: '#d62728' }),
        ],
        width: 8,
        height: 6,
      }),
    );

    // ============================================
    // Row 2: Error and Warning Logs
    // ============================================
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Application Errors & Warnings',
        width: 24,
        height: 1,
      }),
    );

    // Error logs widget - search for ERROR level in JSON logs
    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: '🔴 Error Logs',
        logGroupNames: [lambdaLogGroup.logGroupName],
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
        logGroupNames: [lambdaLogGroup.logGroupName],
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

    // ============================================
    // Row 3: Request Performance
    // ============================================
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
        logGroupNames: [lambdaLogGroup.logGroupName],
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
        left: [lambdaFunction.metricThrottles({ statistic: 'Sum', label: 'Throttled Requests' })],
        width: 12,
        height: 6,
      }),
    );

    // ============================================
    // Row 4: GraphQL Operations
    // ============================================
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
        logGroupNames: [lambdaLogGroup.logGroupName],
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
        logGroupNames: [lambdaLogGroup.logGroupName],
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

    // ============================================
    // Row 5: Error Patterns
    // ============================================
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
        logGroupNames: [lambdaLogGroup.logGroupName],
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

    // ============================================
    // Row 6: API Gateway Metrics
    // ============================================
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
        logGroupNames: [apiAccessLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: ['fields @timestamp', 'stats count() as requestCount by bin(5m)'],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Response Status Codes',
        logGroupNames: [apiAccessLogGroup.logGroupName],
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
        logGroupNames: [apiAccessLogGroup.logGroupName],
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
        left: [lambdaFunction.metricInvocations({ statistic: 'Sum', period: Duration.seconds(60) })],
        width: 12,
        height: 6,
      }),
    );
  }
}
