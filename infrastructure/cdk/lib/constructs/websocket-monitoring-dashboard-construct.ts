import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
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
  DEFAULT_WEBSOCKET_CLIENT_ERROR_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_CONNECT_SPIKE_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_EXECUTION_ERROR_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_INTEGRATION_ERROR_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_LAMBDA_ERROR_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_LAMBDA_THROTTLE_ALARM_THRESHOLDS,
  DEFAULT_WEBSOCKET_MESSAGE_SPIKE_ALARM_THRESHOLDS,
} from '../constants';

function scopedAlarmName(baseName: string, targetSuffix: string): string {
  return `${baseName}-${targetSuffix}`;
}

export interface WebsocketMonitoringDashboardConstructProps {
  stageName: string;
  targetSuffix: string;
  websocketLambdaFunction: IFunction;
  websocketLambdaLogGroup: ILogGroup;
  websocketApi: WebSocketApi;
  websocketStage: WebSocketStage;
  alertTopic?: ITopic;
}

export class WebsocketMonitoringDashboardConstruct extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: WebsocketMonitoringDashboardConstructProps) {
    super(scope, id);

    const {
      stageName,
      targetSuffix,
      websocketLambdaFunction,
      websocketLambdaLogGroup,
      websocketApi,
      websocketStage,
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

    const websocketLambdaErrorAlarm = new Alarm(this, 'WebsocketLambdaErrorAlarm', {
      alarmName: scopedAlarmName('WebSocketLambdaErrors', targetSuffix),
      metric: websocketLambdaFunction.metricErrors({ statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: DEFAULT_WEBSOCKET_LAMBDA_ERROR_ALARM_THRESHOLDS[stageName] ?? 3,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when the WebSocket Lambda records execution errors in at least 2 of 3 consecutive 5-minute periods, so short-lived blips do not leave the alarm permanently open.',
    });

    const websocketLambdaThrottleAlarm = new Alarm(this, 'WebsocketLambdaThrottleAlarm', {
      alarmName: scopedAlarmName('WebSocketLambdaThrottles', targetSuffix),
      metric: websocketLambdaFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: DEFAULT_WEBSOCKET_LAMBDA_THROTTLE_ALARM_THRESHOLDS[stageName] ?? 2,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when the WebSocket Lambda is throttled in a 5-minute window, indicating burst pressure that exceeds configured capacity.',
    });

    const websocketClientErrorAlarm = new Alarm(this, 'WebsocketClientErrorAlarm', {
      alarmName: scopedAlarmName('WebSocketClientErrorSpike', targetSuffix),
      metric: webSocketMetric('ClientError', 'ClientError', '#d62728'),
      threshold: DEFAULT_WEBSOCKET_CLIENT_ERROR_ALARM_THRESHOLDS[stageName] ?? 40,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when client-side WebSocket rejections stay elevated across 2 of 3 consecutive 5-minute periods, which usually points to auth or payload drift rather than isolated reconnect noise.',
    });

    const websocketIntegrationErrorAlarm = new Alarm(this, 'WebsocketIntegrationErrorAlarm', {
      alarmName: scopedAlarmName('WebSocketIntegrationErrorSpike', targetSuffix),
      metric: webSocketMetric('IntegrationError', 'IntegrationError', '#9467bd'),
      threshold: DEFAULT_WEBSOCKET_INTEGRATION_ERROR_ALARM_THRESHOLDS[stageName] ?? 3,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when API Gateway integration errors stay elevated across 2 of 3 consecutive 5-minute periods, indicating backend integration instability rather than a single failed invocation.',
    });

    const websocketExecutionErrorAlarm = new Alarm(this, 'WebsocketExecutionErrorAlarm', {
      alarmName: scopedAlarmName('WebSocketExecutionErrorSpike', targetSuffix),
      metric: webSocketMetric('ExecutionError', 'ExecutionError', '#8c564b'),
      threshold: DEFAULT_WEBSOCKET_EXECUTION_ERROR_ALARM_THRESHOLDS[stageName] ?? 15,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when API Gateway execution errors remain elevated across 2 of 3 consecutive 5-minute periods. This filters out isolated disconnect churn and focuses on sustained protocol failures.',
    });

    const websocketConnectSpikeAlarm = new Alarm(this, 'WebsocketConnectSpikeAlarm', {
      alarmName: scopedAlarmName('WebSocketConnectSpike', targetSuffix),
      metric: webSocketMetric('ConnectCount', 'ConnectCount'),
      threshold: DEFAULT_WEBSOCKET_CONNECT_SPIKE_ALARM_THRESHOLDS[stageName] ?? 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when WebSocket connection attempts stay elevated across 2 of 3 consecutive 5-minute periods, capturing sustained surges rather than brief reconnect bursts.',
    });

    const websocketMessageSpikeAlarm = new Alarm(this, 'WebsocketMessageSpikeAlarm', {
      alarmName: scopedAlarmName('WebSocketMessageSpike', targetSuffix),
      metric: webSocketMetric('MessageCount', 'MessageCount', '#2ca02c'),
      threshold: DEFAULT_WEBSOCKET_MESSAGE_SPIKE_ALARM_THRESHOLDS[stageName] ?? 250,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        'Triggers when WebSocket message volume stays materially above baseline across 2 of 3 consecutive 5-minute periods.',
    });

    attachAlarmAction(
      websocketLambdaErrorAlarm,
      websocketLambdaThrottleAlarm,
      websocketClientErrorAlarm,
      websocketIntegrationErrorAlarm,
      websocketExecutionErrorAlarm,
      websocketConnectSpikeAlarm,
      websocketMessageSpikeAlarm,
    );

    const runtimeAwareErrorQueryLines = [
      'fields @timestamp, level, message, context.routeKey as routeKey, context.connectionId as connectionId, error.name as errorName, error.message as errorMessage, @message',
      'filter level = "ERROR" or @message like /Task timed out/ or @message like /Process exited before completing request/ or @message like /Runtime\\./ or @message like /Unhandled/',
      'sort @timestamp desc',
      'limit 100',
    ];

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
        markdown:
          '## Security Alarms\n\nThese alarms are tuned for sustained spikes, not incidental reconnects or one-off gateway noise. Thresholds intentionally require repeated elevated periods before the alarm opens.',
        width: 24,
        height: 2,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'WebSocket Lambda Errors',
        alarm: websocketLambdaErrorAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'WebSocket Lambda Throttles',
        alarm: websocketLambdaThrottleAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'WebSocket Client Errors',
        alarm: websocketClientErrorAlarm,
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'WebSocket Integration Errors',
        alarm: websocketIntegrationErrorAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'WebSocket Execution Errors',
        alarm: websocketExecutionErrorAlarm,
        width: 8,
        height: 6,
      }),
      new AlarmWidget({
        title: 'WebSocket Connect Spike',
        alarm: websocketConnectSpikeAlarm,
        width: 8,
        height: 6,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmWidget({
        title: 'WebSocket Message Spike',
        alarm: websocketMessageSpikeAlarm,
        width: 24,
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
        title: 'Delivery Anomalies',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        queryLines: [
          'fields @timestamp, message, context.messageId as messageId, context.senderUserId as senderUserId, context.recipientUserId as recipientUserId, context.readerUserId as readerUserId, context.withUserId as withUserId, context.messageDeliveredCount as messageDeliveredCount, context.readEventDeliveredCount as readEventDeliveredCount, context.conversationDeliveredCount as conversationDeliveredCount, context.failedCount as failedCount, context.staleCount as staleCount',
          'filter message = "Chat message sent and delivered" or message = "Chat conversation marked as read"',
          'filter failedCount > 0 or staleCount > 0',
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
        title: 'Recent Application and Runtime Errors',
        logGroupNames: [websocketLambdaLogGroup.logGroupName],
        queryLines: runtimeAwareErrorQueryLines,
        width: 8,
        height: 8,
      }),
    );
  }
}
