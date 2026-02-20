import {
  Dashboard,
  GraphWidget,
  LogQueryVisualizationType,
  LogQueryWidget,
  TextWidget,
} from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface GraphqlMonitoringDashboardConstructProps {
  stageName: string;
  targetSuffix: string;
  graphqlLambdaFunction: IFunction;
  graphqlLambdaLogGroup: ILogGroup;
  graphqlApiAccessLogGroup: ILogGroup;
}

export class GraphqlMonitoringDashboardConstruct extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: GraphqlMonitoringDashboardConstructProps) {
    super(scope, id);

    const { stageName, targetSuffix, graphqlLambdaFunction, graphqlLambdaLogGroup, graphqlApiAccessLogGroup } = props;

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
