import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import {
  Dashboard,
  GraphWidget,
  LogQueryVisualizationType,
  LogQueryWidget,
  Metric,
  TextWidget,
} from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface WebsocketMonitoringDashboardConstructProps {
  stageName: string;
  targetSuffix: string;
  websocketLambdaFunction: IFunction;
  websocketLambdaLogGroup: ILogGroup;
  websocketApi: WebSocketApi;
  websocketStage: WebSocketStage;
}

export class WebsocketMonitoringDashboardConstruct extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: WebsocketMonitoringDashboardConstructProps) {
    super(scope, id);

    const { stageName, targetSuffix, websocketLambdaFunction, websocketLambdaLogGroup, websocketApi, websocketStage } =
      props;

    this.dashboard = new Dashboard(this, 'GatherleWebSocketDashboard', {
      dashboardName: `Gatherle-WebSocket-${targetSuffix}`,
    });

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: `# Gatherle WebSocket Monitoring Dashboard\n\n**Stage:** ${stageName}\n**Lambda Function:** ${websocketLambdaFunction.functionName}\n**WebSocket API Id:** ${websocketApi.apiId}`,
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

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Core Health',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
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

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Traffic and Route Mix',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
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

    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Actionable Operational Signals',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
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

    this.dashboard.addWidgets(
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
