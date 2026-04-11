import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { configDotenv } from 'dotenv';
import { join } from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { ApiMapping, DomainName, WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { DEFAULT_STAGE_WEBAPP_ORIGINS } from '@gatherle/commons';
import { DNS_STACK_CONFIG } from '../constants/dns';
import { buildBackendSecretName, buildResourceName, buildTargetSuffix } from '../utils/naming';

configDotenv();

const pathRoot = join(__dirname, '../../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'lib', 'websocket', 'lambdaHandler.ts');

export interface WebSocketApiStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  enableCustomDomains?: boolean;
}

export class WebSocketApiStack extends Stack {
  readonly websocketLambda: NodejsFunction;
  readonly websocketApi: WebSocketApi;
  readonly websocketStage: WebSocketStage;
  readonly websocketApiEndpointOutput: CfnOutput;
  readonly websocketLambdaLogGroup: LogGroup;

  constructor(scope: Construct, id: string, props: WebSocketApiStackProps) {
    super(scope, id, props);
    const stageSegment = props.applicationStage.toLowerCase();
    const targetSuffix = buildTargetSuffix(props.applicationStage, props.awsRegion);
    const enableCustomDomains = props.enableCustomDomains ?? false;
    const websocketLambdaName = buildResourceName('WebSocketLambdaFunction', props.applicationStage, props.awsRegion);

    const gatherleSecret = Secret.fromSecretNameV2(
      this,
      'WebSocketImportedSecret',
      buildBackendSecretName(props.applicationStage, props.awsRegion),
    );

    this.websocketLambdaLogGroup = new LogGroup(this, 'WebSocketLambdaLogGroup', {
      logGroupName: `/aws/lambda/${websocketLambdaName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.websocketLambda = new NodejsFunction(this, 'WebSocketLambdaFunction', {
      functionName: websocketLambdaName,
      description: 'Lambda handler for websocket connect/disconnect and realtime message routes.',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      handler: 'websocketLambdaHandler',
      entry: pathHandlerFile,
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
        nodeModules: ['@typegoose/typegoose', 'reflect-metadata', 'mongoose', 'mongodb'],
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        WEBSOCKET_CONNECTION_TTL_HOURS: '24',
        NODE_OPTIONS: '--enable-source-maps',
        EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@gatherle.com',
        WEBAPP_URL:
          process.env.WEBAPP_URL ||
          DEFAULT_STAGE_WEBAPP_ORIGINS[props.applicationStage]?.[0] ||
          'http://localhost:3000',
      },
      logGroup: this.websocketLambdaLogGroup,
    });

    gatherleSecret.grantRead(this.websocketLambda);

    this.websocketApi = new WebSocketApi(this, 'GatherleWebSocketApi', {
      apiName: buildResourceName('gatherle-websocket-api', props.applicationStage, props.awsRegion),
      description: 'Gatherle websocket API for realtime notifications and chat',
      routeSelectionExpression: '$request.body.action',
    });

    this.websocketApi.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketConnectLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('$disconnect', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketDisconnectLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('$default', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketDefaultLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('ping', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketPingLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('notification.subscribe', {
      integration: new WebSocketLambdaIntegration(
        'GatherleWebSocketNotificationSubscribeLambdaIntegration',
        this.websocketLambda,
      ),
    });
    this.websocketApi.addRoute('chat.send', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketChatSendLambdaIntegration', this.websocketLambda),
    });
    this.websocketApi.addRoute('chat.read', {
      integration: new WebSocketLambdaIntegration('GatherleWebSocketChatReadLambdaIntegration', this.websocketLambda),
    });

    this.websocketApi.grantManageConnections(this.websocketLambda);

    this.websocketStage = new WebSocketStage(this, 'GatherleWebSocketStage', {
      webSocketApi: this.websocketApi,
      stageName: stageSegment,
      autoDeploy: true,
    });

    let websocketApiEndpoint = this.websocketStage.url;

    if (enableCustomDomains) {
      // Read hosted zone ID and certificate ARN from SSM at deploy time. valueForStringParameter()
      // emits a CloudFormation {{resolve:ssm:...}} dynamic reference — no Fn::ImportValue is
      // generated, so WebSocketApiStack deploys independently of GraphQLStack. Combined with
      // addDependency(stageInfraStack) in setupAccount.ts, CDK's deployment engine ensures
      // StageInfraStack completes before this stack starts, so the parameters always exist.
      const hostedZoneId = StringParameter.valueForStringParameter(
        this,
        `/gatherle/${stageSegment}/${props.awsRegion}/stageHostedZoneId`,
      );
      const certificateArn = StringParameter.valueForStringParameter(
        this,
        `/gatherle/${stageSegment}/${props.awsRegion}/stageCertificateArn`,
      );
      const stageRegionDomainName = `${stageSegment}.${props.awsRegion.toLowerCase()}.${DNS_STACK_CONFIG.rootDomainName}`;

      const importedHostedZone = HostedZone.fromHostedZoneAttributes(this, 'ImportedStageHostedZone', {
        hostedZoneId,
        zoneName: stageRegionDomainName,
      });
      const importedCertificate = Certificate.fromCertificateArn(this, 'ImportedStageCertificate', certificateArn);

      const websocketCustomDomainName = `ws.${stageRegionDomainName}`;
      const websocketCustomDomain = new DomainName(this, 'GatherleWebSocketCustomDomain', {
        domainName: websocketCustomDomainName,
        certificate: importedCertificate,
      });

      new ApiMapping(this, 'GatherleWebSocketApiMapping', {
        api: this.websocketApi,
        domainName: websocketCustomDomain,
        stage: this.websocketStage,
      });

      new ARecord(this, 'GatherleWebSocketCustomDomainARecord', {
        zone: importedHostedZone,
        recordName: 'ws',
        target: RecordTarget.fromAlias(
          new ApiGatewayv2DomainProperties(
            websocketCustomDomain.regionalDomainName,
            websocketCustomDomain.regionalHostedZoneId,
          ),
        ),
      });

      websocketApiEndpoint = `wss://${websocketCustomDomainName}`;
    }

    this.websocketApiEndpointOutput = new CfnOutput(this, 'websocketApiUrl', {
      value: websocketApiEndpoint,
      description: 'The URL of the websocket API',
      exportName: `WebSocketApiEndpoint-${targetSuffix}`,
    });
  }
}
