import { Stack, StackProps } from 'aws-cdk-lib/core';
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
        title: 'Lambda Duration',
        left: [
          lambdaFunction.metricDuration({ statistic: 'Average', label: 'Avg' }),
          lambdaFunction.metricDuration({ statistic: 'Maximum', label: 'Max', color: '#ff7f0e' }),
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
        title: '🔴 Error Logs (Last Hour)',
        logGroupNames: [lambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, requestId, context.error.name as errorName, context.error.message as errorMessage',
          'filter level = "ERROR"',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 8,
      }),
      new LogQueryWidget({
        title: '⚠️ Warning Logs (Last Hour)',
        logGroupNames: [lambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, requestId, context',
          'filter level = "WARN"',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 8,
      }),
    );

    // ============================================
    // Row 3: Error and Warning Counts
    // ============================================
    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Error Count Over Time',
        logGroupNames: [lambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: ['fields @timestamp', 'filter level = "ERROR"', 'stats count() as errorCount by bin(5m)'],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Warning Count Over Time',
        logGroupNames: [lambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: ['fields @timestamp', 'filter level = "WARN"', 'stats count() as warningCount by bin(5m)'],
        width: 12,
        height: 6,
      }),
    );

    // ============================================
    // Row 4: Top Errors
    // ============================================
    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Top Error Messages',
        logGroupNames: [lambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.BAR,
        queryLines: [
          'fields message',
          'filter level = "ERROR"',
          'stats count() as count by message',
          'sort count desc',
          'limit 10',
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Top Error Types',
        logGroupNames: [lambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.BAR,
        queryLines: [
          'fields context.error.name as errorType',
          'filter level = "ERROR" and ispresent(errorType)',
          'stats count() as count by errorType',
          'sort count desc',
          'limit 10',
        ],
        width: 12,
        height: 6,
      }),
    );

    // ============================================
    // Row 5: Request Performance
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
        title: 'Error Rate Over Time',
        logGroupNames: [lambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp',
          'filter level = "ERROR"',
          'stats count() as errorCount by bin(5m)',
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
        queryLines: [
          'fields @timestamp',
          'stats count() as requestCount by bin(5m)',
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Response Status Codes',
        logGroupNames: [apiAccessLogGroup.logGroupName],
        view: LogQueryVisualizationType.BAR,
        queryLines: [
          'parse @message /\\s(?<status>\\d{3})\\s/',
          'stats count() as count by status',
          'sort count desc',
        ],
        width: 12,
        height: 6,
      }),
    );
  }
}
