import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { GraphqlMonitoringDashboardConstruct, WebsocketMonitoringDashboardConstruct } from '../constructs';
import { buildResourceName, buildTargetSuffix } from '../utils/naming';

export interface MonitoringDashboardStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  alertEmailRecipients?: string[];
  graphqlApi: RestApi;
  graphqlLambdaFunction: IFunction;
  graphqlLambdaLogGroup: ILogGroup;
  graphqlApiAccessLogGroup: ILogGroup;
  occurrenceMaintenanceLambdaFunction: IFunction;
  occurrenceMaintenanceLambdaLogGroup: ILogGroup;
  websocketLambdaFunction: IFunction;
  websocketLambdaLogGroup: ILogGroup;
  websocketApi: WebSocketApi;
  websocketStage: WebSocketStage;
}

export class MonitoringDashboardStack extends Stack {
  readonly graphqlDashboard: Dashboard;
  readonly websocketDashboard: Dashboard;
  readonly operationalAlertsTopic: Topic;
  readonly operationalAlertsTopicArnOutput: CfnOutput;

  constructor(scope: Construct, id: string, props: MonitoringDashboardStackProps) {
    super(scope, id, props);

    const stageName = props.applicationStage;
    const targetSuffix = buildTargetSuffix(stageName, props.awsRegion);
    const alertEmailRecipients = props.alertEmailRecipients ?? [];

    this.operationalAlertsTopic = new Topic(this, 'OperationalAlertsTopic', {
      topicName: buildResourceName('gatherle-operational-alerts', stageName, props.awsRegion),
      displayName: `Gatherle operational alerts ${targetSuffix}`,
    });

    alertEmailRecipients.forEach((recipient) => {
      this.operationalAlertsTopic.addSubscription(new EmailSubscription(recipient));
    });

    const graphqlDashboardConstruct = new GraphqlMonitoringDashboardConstruct(
      this,
      'GraphqlMonitoringDashboardConstruct',
      {
        stageName,
        awsRegion: props.awsRegion,
        targetSuffix,
        graphqlApi: props.graphqlApi,
        graphqlLambdaFunction: props.graphqlLambdaFunction,
        graphqlLambdaLogGroup: props.graphqlLambdaLogGroup,
        graphqlApiAccessLogGroup: props.graphqlApiAccessLogGroup,
        occurrenceMaintenanceLambdaFunction: props.occurrenceMaintenanceLambdaFunction,
        occurrenceMaintenanceLambdaLogGroup: props.occurrenceMaintenanceLambdaLogGroup,
        alertTopic: this.operationalAlertsTopic,
      },
    );

    const websocketDashboardConstruct = new WebsocketMonitoringDashboardConstruct(
      this,
      'WebsocketMonitoringDashboardConstruct',
      {
        stageName,
        targetSuffix,
        websocketLambdaFunction: props.websocketLambdaFunction,
        websocketLambdaLogGroup: props.websocketLambdaLogGroup,
        websocketApi: props.websocketApi,
        websocketStage: props.websocketStage,
        alertTopic: this.operationalAlertsTopic,
      },
    );

    this.graphqlDashboard = graphqlDashboardConstruct.dashboard;
    this.websocketDashboard = websocketDashboardConstruct.dashboard;

    this.operationalAlertsTopicArnOutput = new CfnOutput(this, 'OperationalAlertsTopicArn', {
      value: this.operationalAlertsTopic.topicArn,
      description: 'SNS topic that receives Gatherle GraphQL and WebSocket CloudWatch alarm notifications.',
      exportName: `OperationalAlertsTopicArn-${targetSuffix}`,
    });
  }
}
