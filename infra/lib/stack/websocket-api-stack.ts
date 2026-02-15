import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { configDotenv } from 'dotenv';
import { join } from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

configDotenv();

const pathRoot = join(__dirname, '../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'dist', 'apps', 'api', 'lib', 'websocket', 'lambdaHandler.js');

export class WebSocketApiStack extends Stack {
  readonly websocketLambda: NodejsFunction;
  readonly websocketApi: WebSocketApi;
  readonly websocketStage: WebSocketStage;
  readonly websocketApiEndpointOutput: CfnOutput;
  readonly websocketLambdaLogGroup: LogGroup;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const stageSegment = `${process.env.STAGE ?? 'Beta'}`.toLowerCase();

    const ntlangoSecret = Secret.fromSecretNameV2(this, 'WebSocketImportedSecret', `ntlango/backend/${stageSegment}`);

    this.websocketLambdaLogGroup = new LogGroup(this, 'WebSocketLambdaLogGroup', {
      logGroupName: '/aws/lambda/WebSocketLambdaFunction',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.websocketLambda = new NodejsFunction(this, 'WebSocketLambdaFunction', {
      functionName: 'WebSocketLambdaFunction',
      description: 'Lambda handler for websocket connect/disconnect and realtime message routes.',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      handler: 'websocketLambdaHandler',
      entry: pathHandlerFile,
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        sourceMap: true,
        minify: false,
        nodeModules: ['@typegoose/typegoose', 'reflect-metadata', 'mongoose', 'mongodb'],
      },
      environment: {
        STAGE: `${process.env.STAGE}`,
        NTLANGO_SECRET_ARN: ntlangoSecret.secretArn,
        WEBSOCKET_CONNECTION_TTL_HOURS: '24',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.websocketLambdaLogGroup,
    });

    ntlangoSecret.grantRead(this.websocketLambda);

    this.websocketApi = new WebSocketApi(this, 'NtlangoWebSocketApi', {
      apiName: 'NtlangoWebSocketApi',
      description: 'Ntlango websocket API for realtime notifications and chat',
      routeSelectionExpression: '$request.body.action',
    });

    this.websocketApi.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketConnectLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('$disconnect', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketDisconnectLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('$default', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketDefaultLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('ping', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketPingLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('notification.subscribe', {
      integration: new WebSocketLambdaIntegration(
        'NtlangoWebSocketNotificationSubscribeLambdaIntegration',
        this.websocketLambda,
      ),
    });
    this.websocketApi.addRoute('chat.send', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketChatSendLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('chat.read', {
      integration: new WebSocketLambdaIntegration('NtlangoWebSocketChatReadLambdaIntegration', this.websocketLambda),
    });

    this.websocketApi.grantManageConnections(this.websocketLambda);

    this.websocketStage = new WebSocketStage(this, 'NtlangoWebSocketStage', {
      webSocketApi: this.websocketApi,
      stageName: `${process.env.STAGE}`.toLowerCase(),
      autoDeploy: true,
    });

    this.websocketApiEndpointOutput = new CfnOutput(this, 'websocketApiUrl', {
      value: this.websocketStage.url,
      description: 'The URL of the websocket API',
      exportName: 'WebSocketApiEndpoint',
    });
  }
}
