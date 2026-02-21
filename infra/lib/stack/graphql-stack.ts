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
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { configDotenv } from 'dotenv';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import { join } from 'path';
import { DNS_STACK_CONFIG } from '../constants/dns';
import { buildBackendSecretName, buildResourceName, buildTargetSuffix } from '../utils/naming';

configDotenv();

const pathRoot = join(__dirname, '../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'dist', 'apps', 'api', 'lib', 'graphql', 'apollo', 'lambdaHandler.js');

export interface GraphQLStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  s3BucketName?: string;
  enableCustomDomains?: boolean;
}

export class GraphQLStack extends Stack {
  readonly graphqlLambda: NodejsFunction;
  readonly graphqlApi: RestApi;
  readonly graphql: ResourceBase;
  readonly graphqlApiPathOutput: CfnOutput;
  readonly graphqlLambdaLogGroup: LogGroup;
  readonly graphqlApiAccessLogGroup: LogGroup;
  readonly stageHostedZone: PublicHostedZone;
  readonly stageDomainCertificate?: Certificate;
  readonly stageRegionDomainName: string;
  readonly stageHostedZoneNameServersOutput: CfnOutput;
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
        sourceMap: true,
        minify: false,
        nodeModules: ['@typegoose/typegoose', 'reflect-metadata', 'mongoose', 'mongodb'],
        loader: { '.html': 'file' },
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        S3_BUCKET_NAME: props.s3BucketName || '',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.graphqlLambdaLogGroup,
    });

    gatherleSecret.grantRead(this.graphqlLambda);

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
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(this.graphqlApiAccessLogGroup),
        accessLogFormat: AccessLogFormat.clf(),
        stageName: stageSegment,
      },
    });

    this.graphql = this.graphqlApi.root.addResource('graphql');
    this.graphql.addMethod('ANY');

    this.stageHostedZone = new PublicHostedZone(this, 'StageRegionHostedZone', {
      zoneName: this.stageRegionDomainName,
    });

    this.stageHostedZoneNameServersOutput = new CfnOutput(this, 'stageHostedZoneNameServers', {
      value: Fn.join(', ', this.stageHostedZone.hostedZoneNameServers ?? []),
      description: 'Name servers for stage-region delegated hosted zone',
      exportName: `StageHostedZoneNameServers-${targetSuffix}`,
    });

    let graphqlApiEndpoint = this.graphqlApi.urlForPath('/graphql');

    if (enableCustomDomains) {
      this.stageDomainCertificate = new Certificate(this, 'StageRegionDomainCertificate', {
        domainName: this.stageRegionDomainName,
        subjectAlternativeNames: [`*.${this.stageRegionDomainName}`],
        validation: CertificateValidation.fromDns(this.stageHostedZone),
      });

      const graphqlCustomDomain = new DomainName(this, 'GraphqlCustomDomain', {
        domainName: graphqlCustomDomainName,
        certificate: this.stageDomainCertificate,
        endpointType: EndpointType.REGIONAL,
        securityPolicy: SecurityPolicy.TLS_1_2,
      });

      new BasePathMapping(this, 'GraphqlCustomDomainBasePathMapping', {
        domainName: graphqlCustomDomain,
        restApi: this.graphqlApi,
      });

      new ARecord(this, 'GraphqlCustomDomainARecord', {
        zone: this.stageHostedZone,
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
