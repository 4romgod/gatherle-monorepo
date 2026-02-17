import { Stack, StackProps, Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {
  Dashboard,
  GraphWidget,
  LogQueryWidget,
  Metric,
  TextWidget,
  LogQueryVisualizationType,
} from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { APPLICATION_STAGES } from '@ntlango/commons';

export interface MonitoringDashboardStackProps extends StackProps {
  graphqlLambdaFunction: IFunction;
  graphqlLambdaLogGroup: ILogGroup;
  graphqlApiAccessLogGroup: ILogGroup;
  websocketLambdaFunction: IFunction;
  websocketLambdaLogGroup: ILogGroup;
  websocketApi: WebSocketApi;
  websocketStage: WebSocketStage;
}

export class MonitoringDashboardStack extends Stack {
  readonly graphqlDashboard: Dashboard;
  readonly websocketDashboard: Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringDashboardStackProps) {
    super(scope, id, props);

    const stageName = process.env.STAGE || APPLICATION_STAGES.BETA;
    const {
      graphqlLambdaFunction,
      graphqlLambdaLogGroup,
      graphqlApiAccessLogGroup,
      websocketLambdaFunction,
      websocketLambdaLogGroup,
      websocketApi,
      websocketStage,
    } = props;

    this.graphqlDashboard = new Dashboard(this, 'NtlangoGraphqlDashboard', {
      dashboardName: `Ntlango-GraphQL-${stageName}`,
    });

    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: `# Ntlango GraphQL Monitoring Dashboard\n\n**Stage:** ${stageName}\n**Lambda Function:** ${graphqlLambdaFunction.functionName}`,
        width: 24,
        height: 2,
      }),
    );

    // ============================================
    // Row 1: Lambda Function Metrics
    // ============================================
    this.graphqlDashboard.addWidgets(
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

    // ============================================
    // Row 2: Error and Warning Logs
    // ============================================
    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: '## Application Errors & Warnings',
        width: 24,
        height: 1,
      }),
    );

    // Error logs widget - search for ERROR level in JSON logs
    this.graphqlDashboard.addWidgets(
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

    // ============================================
    // Row 3: Request Performance
    // ============================================
    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: '## Request Performance',
        width: 24,
        height: 1,
      }),
    );

    this.graphqlDashboard.addWidgets(
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

    // ============================================
    // Row 4: GraphQL Operations
    // ============================================
    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: '## GraphQL Operations',
        width: 24,
        height: 1,
      }),
    );

    this.graphqlDashboard.addWidgets(
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

    // ============================================
    // Row 5: Error Patterns
    // ============================================
    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: '## Error Patterns',
        width: 24,
        height: 1,
      }),
    );

    this.graphqlDashboard.addWidgets(
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

    // ============================================
    // Row 6: API Gateway Metrics
    // ============================================
    this.graphqlDashboard.addWidgets(
      new TextWidget({
        markdown: '## API Gateway Metrics',
        width: 24,
        height: 1,
      }),
    );

    this.graphqlDashboard.addWidgets(
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

    this.graphqlDashboard.addWidgets(
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

    this.websocketDashboard = new Dashboard(this, 'NtlangoWebSocketDashboard', {
      dashboardName: `Ntlango-WebSocket-${stageName}`,
    });

    this.websocketDashboard.addWidgets(
      new TextWidget({
        markdown: `# Ntlango WebSocket Monitoring Dashboard\n\n**Stage:** ${stageName}\n**Lambda Function:** ${websocketLambdaFunction.functionName}\n**WebSocket API Id:** ${websocketApi.apiId}`,
        width: 24,
        height: 2,
      }),
    );

    const webSocketMetric = (metricName: string, label: string, color?: string) =>
      new Metric({
        namespace: 'AWS/ApiGateway',
        metricName,
        label,
        dimensionsMap: {
          ApiId: websocketApi.apiId,
          Stage: websocketStage.stageName,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
        color,
      });

    this.websocketDashboard.addWidgets(
      new TextWidget({
        markdown: '## Core Health',
        width: 24,
        height: 1,
      }),
    );

    this.websocketDashboard.addWidgets(
      new GraphWidget({
        title: 'Lambda Health',
        left: [
          websocketLambdaFunction.metricInvocations({ statistic: 'Sum', label: 'Invocations' }),
          websocketLambdaFunction.metricErrors({ statistic: 'Sum', label: 'Errors', color: '#d62728' }),
          websocketLambdaFunction.metricThrottles({ statistic: 'Sum', label: 'Throttles', color: '#9467bd' }),
        ],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Lambda Duration (P95, P99)',
        left: [
          websocketLambdaFunction.metricDuration({
            statistic: 'p95',
            label: 'P95',
            color: '#ff7f0e',
          }),
          websocketLambdaFunction.metricDuration({
            statistic: 'p99',
            label: 'P99',
            color: '#d62728',
          }),
        ],
        width: 8,
        height: 6,
      }),
      new GraphWidget({
        title: 'Gateway Errors',
        left: [
          webSocketMetric('ClientError', 'ClientError', '#d62728'),
          webSocketMetric('IntegrationError', 'IntegrationError', '#9467bd'),
          webSocketMetric('ExecutionError', 'ExecutionError', '#8c564b'),
        ],
        width: 8,
        height: 6,
      }),
    );

    this.websocketDashboard.addWidgets(
      new TextWidget({
        markdown: '## Traffic and Route Mix',
        width: 24,
        height: 1,
      }),
    );

    this.websocketDashboard.addWidgets(
      new GraphWidget({
        title: 'Connections and Message Throughput',
        left: [
          webSocketMetric('ConnectCount', 'ConnectCount'),
          webSocketMetric('DisconnectCount', 'DisconnectCount', '#ff7f0e'),
          webSocketMetric('MessageCount', 'MessageCount', '#2ca02c'),
        ],
        width: 12,
        height: 6,
      }),
      new LogQueryWidget({
        title: 'Route Mix (5m)',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp, context.routeKey as routeKey',
          'filter message = "WebSocket lambda handler invoked" and ispresent(routeKey)',
          'stats count() as requests by routeKey, bin(5m)',
        ],
        width: 12,
        height: 6,
      }),
    );

    this.websocketDashboard.addWidgets(
      new TextWidget({
        markdown: '## Actionable Operational Signals',
        width: 24,
        height: 1,
      }),
    );

    this.websocketDashboard.addWidgets(
      new LogQueryWidget({
        title: 'Auth and Payload Rejections',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, context.routeKey as routeKey, context.connectionId as connectionId',
          'filter level = "WARN"',
          'filter message like /rejected/ or message like /Invalid payload/ or message like /not registered/',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 8,
      }),
      new LogQueryWidget({
        title: '$default Fallback Activity (5m)',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp',
          'filter message = "Routing websocket action through $default fallback" or message = "Unhandled websocket action"',
          'stats count() as fallbackEvents by bin(5m)',
        ],
        width: 12,
        height: 8,
      }),
    );

    this.websocketDashboard.addWidgets(
      new LogQueryWidget({
        title: 'Delivery Outcome Samples',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, context.messageDeliveredCount as messageDeliveredCount, context.readEventDeliveredCount as readEventDeliveredCount, context.conversationDeliveredCount as conversationDeliveredCount, context.failedCount as failedCount, context.staleCount as staleCount',
          'filter message = "Chat message sent and delivered" or message = "Chat conversation marked as read"',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 8,
        height: 8,
      }),
      new LogQueryWidget({
        title: 'Stale Connection Cleanup (5m)',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        view: LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp',
          'filter message = "Removed stale websocket connection" or message = "Removed stale websocket connection after GoneException"',
          'stats count() as staleConnectionRemovals by bin(5m)',
        ],
        width: 8,
        height: 8,
      }),
      new LogQueryWidget({
        title: 'Recent Errors',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, context.routeKey as routeKey, context.connectionId as connectionId, error.name as errorName, error.message as errorMessage',
          'filter level = "ERROR"',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 8,
        height: 8,
      }),
    );
  }
}
