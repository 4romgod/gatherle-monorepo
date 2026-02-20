import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { GraphqlMonitoringDashboardConstruct, WebsocketMonitoringDashboardConstruct } from '../constructs';
import { buildTargetSuffix } from '../utils/naming';

export interface MonitoringDashboardStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
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

    const stageName = props.applicationStage;
    const targetSuffix = buildTargetSuffix(stageName, props.awsRegion);

    const graphqlDashboardConstruct = new GraphqlMonitoringDashboardConstruct(
      this,
      'GraphqlMonitoringDashboardConstruct',
      {
        stageName,
        targetSuffix,
        graphqlLambdaFunction: props.graphqlLambdaFunction,
        graphqlLambdaLogGroup: props.graphqlLambdaLogGroup,
        graphqlApiAccessLogGroup: props.graphqlApiAccessLogGroup,
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
      },
    );

    this.graphqlDashboard = graphqlDashboardConstruct.dashboard;
    this.websocketDashboard = websocketDashboardConstruct.dashboard;
  }
}
