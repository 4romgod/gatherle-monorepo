import {
  AccessLogFormat,
  BasePathMapping,
  DomainName,
  EndpointType,
  LambdaRestApi,
  LogGroupLogDestination,
  ResourceBase,
  RestApi,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { configDotenv } from 'dotenv';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Schedule, ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import { LambdaInvoke } from 'aws-cdk-lib/aws-scheduler-targets';
import { join } from 'path';
import { DEFAULT_STAGE_WEBAPP_ORIGINS, APPLICATION_STAGES } from '@gatherle/commons';
import { DNS_STACK_CONFIG } from '../constants/dns';
import { buildBackendSecretName, buildResourceName, buildTargetSuffix } from '../utils/naming';

configDotenv();

const pathRoot = join(__dirname, '../../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'lib', 'lambdaHandlers', 'graphqlHandler.ts');

export interface GraphQLStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  s3BucketName?: string;
  mediaCdnDomain?: string;
  enableCustomDomains?: boolean;
}

export class GraphQLStack extends Stack {
  readonly graphqlLambda: NodejsFunction;
  readonly graphqlApi: RestApi;
  readonly graphql: ResourceBase;
  readonly graphqlApiPathOutput: CfnOutput;
  readonly graphqlLambdaLogGroup: LogGroup;
  readonly graphqlApiAccessLogGroup: LogGroup;
  readonly stageRegionDomainName: string;
  readonly graphqlApiDomainOutput?: CfnOutput;

  constructor(scope: Construct, id: string, props: GraphQLStackProps) {
    super(scope, id, props);
    const stageSegment = props.applicationStage.toLowerCase();
    const targetSuffix = buildTargetSuffix(props.applicationStage, props.awsRegion);
    const enableCustomDomains = props.enableCustomDomains ?? false;
    this.stageRegionDomainName = `${stageSegment}.${props.awsRegion.toLowerCase()}.${DNS_STACK_CONFIG.rootDomainName}`;
    const graphqlCustomDomainName = `api.${this.stageRegionDomainName}`;
    const graphqlLambdaName = buildResourceName('GraphqlLambdaFunction', props.applicationStage, props.awsRegion);

    const gatherleSecret = Secret.fromSecretNameV2(
      this,
      'ImportedSecret',
      buildBackendSecretName(props.applicationStage, props.awsRegion),
    );

    this.graphqlLambdaLogGroup = new LogGroup(this, 'GraphqlLambdaLogGroup', {
      logGroupName: `/aws/lambda/${graphqlLambdaName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.graphqlLambda = new NodejsFunction(this, 'GraphqlLambdaFunction', {
      functionName: graphqlLambdaName,
      description:
        'This lambda function is a GraphQL Lambda that uses Apollo server: https://www.apollographql.com/docs/apollo-server/deployment/lambda',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      handler: 'graphqlLambdaHandler',
      entry: pathHandlerFile,
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
        nodeModules: ['@typegoose/typegoose', 'reflect-metadata', 'mongoose', 'mongodb'],
        loader: { '.html': 'file' },
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        S3_BUCKET_NAME: props.s3BucketName || '',
        MEDIA_CDN_DOMAIN: props.mediaCdnDomain || '',
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS ?? '',
        EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@gatherle.com',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
        WEBAPP_URL:
          process.env.WEBAPP_URL ||
          DEFAULT_STAGE_WEBAPP_ORIGINS[props.applicationStage]?.[0] ||
          'http://localhost:3000',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.graphqlLambdaLogGroup,
    });

    gatherleSecret.grantRead(this.graphqlLambda);

    const warmUpIntervalMinutes = props.applicationStage === APPLICATION_STAGES.PROD ? 5 : 14;
    new Schedule(this, 'GraphqlLambdaWarmUpSchedule', {
      scheduleName: buildResourceName('graphql-lambda-warmup', props.applicationStage, props.awsRegion),
      description: `Keeps the GraphQL Lambda warm by invoking it every ${warmUpIntervalMinutes} minutes`,
      schedule: ScheduleExpression.rate(Duration.minutes(warmUpIntervalMinutes)),
      target: new LambdaInvoke(this.graphqlLambda, { retryAttempts: 0 }),
    });

    this.graphqlApiAccessLogGroup = new LogGroup(this, 'GraphqlRestApiAccessLogs', {
      logGroupName: `/aws/apigateway/${buildResourceName(
        'GraphqlRestApiAccessLogs',
        props.applicationStage,
        props.awsRegion,
      )}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.graphqlApi = new LambdaRestApi(this, 'GraphqlRestApiId', {
      handler: this.graphqlLambda,
      proxy: false,
      cloudWatchRole: true,
      description: 'REST API Gateway for GraphQL Lambda function',
      restApiName: buildResourceName('gatherle-graphql-api', props.applicationStage, props.awsRegion),
      disableExecuteApiEndpoint: enableCustomDomains,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(this.graphqlApiAccessLogGroup),
        accessLogFormat: AccessLogFormat.clf(),
        stageName: stageSegment,
      },
    });

    this.graphql = this.graphqlApi.root.addResource('graphql');
    this.graphql.addMethod('ANY');

    let graphqlApiEndpoint = this.graphqlApi.urlForPath('/graphql');

    if (enableCustomDomains) {
      // Read hosted zone ID and certificate ARN from SSM at deploy time. valueForStringParameter()
      // emits a CloudFormation {{resolve:ssm:...}} dynamic reference — no Fn::ImportValue is
      // generated, so GraphQLStack deploys independently of StageInfraStack. Combined with
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

      const importedHostedZone = HostedZone.fromHostedZoneAttributes(this, 'ImportedStageHostedZone', {
        hostedZoneId,
        zoneName: this.stageRegionDomainName,
      });
      const importedCertificate = Certificate.fromCertificateArn(this, 'ImportedStageCertificate', certificateArn);

      const graphqlCustomDomain = new DomainName(this, 'GraphqlCustomDomain', {
        domainName: graphqlCustomDomainName,
        certificate: importedCertificate,
        endpointType: EndpointType.REGIONAL,
        securityPolicy: SecurityPolicy.TLS_1_2,
      });

      new BasePathMapping(this, 'GraphqlCustomDomainBasePathMapping', {
        domainName: graphqlCustomDomain,
        restApi: this.graphqlApi,
      });

      new ARecord(this, 'GraphqlCustomDomainARecord', {
        zone: importedHostedZone,
        recordName: 'api',
        target: RecordTarget.fromAlias(new ApiGatewayDomain(graphqlCustomDomain)),
      });

      graphqlApiEndpoint = `https://${graphqlCustomDomainName}/graphql`;

      this.graphqlApiDomainOutput = new CfnOutput(this, 'graphqlDomainName', {
        value: graphqlCustomDomainName,
        description: 'Custom domain name of the GraphQL API',
        exportName: `GraphQLApiDomainName-${targetSuffix}`,
      });
    }

    this.graphqlApiPathOutput = new CfnOutput(this, 'apiPath', {
      value: graphqlApiEndpoint,
      description: 'The URL of the GraphQL API',
      exportName: `GraphQLApiEndpoint-${targetSuffix}`,
    });
  }
}
