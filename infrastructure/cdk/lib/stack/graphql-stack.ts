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
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { join } from 'path';
import { DEFAULT_STAGE_WEBAPP_ORIGINS, APPLICATION_STAGES } from '@gatherle/commons/server';
import {
  DEFAULT_GRAPHQL_API_THROTTLE_BURST_LIMITS,
  DEFAULT_GRAPHQL_API_THROTTLE_RATE_LIMITS,
  DEFAULT_GRAPHQL_API_WAF_RATE_LIMITS,
  DNS_STACK_CONFIG,
} from '../constants';
import {
  buildBackendSecretName,
  buildMetricName,
  buildResourceName,
  buildTargetSuffix,
  parsePositiveIntegerEnv,
} from '../utils';

configDotenv();

const pathRoot = join(__dirname, '../../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'lib', 'lambdaHandlers', 'graphqlHandler.ts');
const pathOccurrenceMaintenanceHandlerFile = join(pathApi, 'lib', 'lambdaHandlers', 'maintainEventOccurrences.ts');

export interface GraphQLStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  s3BucketName?: string;
  mediaCdnDomain?: string;
  enableCustomDomains?: boolean;
}

export class GraphQLStack extends Stack {
  readonly graphqlLambda: NodejsFunction;
  readonly occurrenceMaintenanceLambda: NodejsFunction;
  readonly graphqlApi: RestApi;
  readonly graphql: ResourceBase;
  readonly graphqlApiPathOutput: CfnOutput;
  readonly graphqlLambdaLogGroup: LogGroup;
  readonly occurrenceMaintenanceLambdaLogGroup: LogGroup;
  readonly graphqlApiAccessLogGroup: LogGroup;
  readonly stageRegionDomainName: string;
  readonly graphqlApiDomainOutput?: CfnOutput;

  constructor(scope: Construct, id: string, props: GraphQLStackProps) {
    super(scope, id, props);
    const stageSegment = props.applicationStage.toLowerCase();
    const targetSuffix = buildTargetSuffix(props.applicationStage, props.awsRegion);
    const enableCustomDomains = props.enableCustomDomains ?? false;
    const graphqlApiThrottleRateLimit = parsePositiveIntegerEnv(
      'GRAPHQL_API_THROTTLE_RATE_LIMIT',
      process.env.GRAPHQL_API_THROTTLE_RATE_LIMIT,
      DEFAULT_GRAPHQL_API_THROTTLE_RATE_LIMITS[props.applicationStage] ?? 50,
    );
    const graphqlApiThrottleBurstLimit = parsePositiveIntegerEnv(
      'GRAPHQL_API_THROTTLE_BURST_LIMIT',
      process.env.GRAPHQL_API_THROTTLE_BURST_LIMIT,
      DEFAULT_GRAPHQL_API_THROTTLE_BURST_LIMITS[props.applicationStage] ?? 100,
    );
    const graphqlApiWafRateLimit = parsePositiveIntegerEnv(
      'GRAPHQL_API_WAF_RATE_LIMIT',
      process.env.GRAPHQL_API_WAF_RATE_LIMIT,
      DEFAULT_GRAPHQL_API_WAF_RATE_LIMITS[props.applicationStage] ?? 2000,
      100,
    );
    this.stageRegionDomainName = `${stageSegment}.${props.awsRegion.toLowerCase()}.${DNS_STACK_CONFIG.rootDomainName}`;
    const graphqlCustomDomainName = `api.${this.stageRegionDomainName}`;
    const graphqlLambdaName = buildResourceName('GraphqlLambdaFunction', props.applicationStage, props.awsRegion);
    const occurrenceMaintenanceLambdaName = buildResourceName(
      'OccurrenceMaintenanceLambdaFunction',
      props.applicationStage,
      props.awsRegion,
    );

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
      memorySize: 512,
      handler: 'graphqlLambdaHandler',
      entry: pathHandlerFile,
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
        loader: { '.html': 'file' },
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        S3_BUCKET_NAME: props.s3BucketName || '',
        MEDIA_CDN_DOMAIN: props.mediaCdnDomain || '',
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS ?? '',
        EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@gatherle.com',
        GOOGLE_OAUTH_CLIENT_ID_WEB: process.env.GOOGLE_OAUTH_CLIENT_ID_WEB ?? '',
        GOOGLE_OAUTH_CLIENT_ID_ANDROID: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID ?? '',
        GOOGLE_OAUTH_CLIENT_ID_IOS: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS ?? '',
        WEBAPP_URL:
          process.env.WEBAPP_URL ||
          DEFAULT_STAGE_WEBAPP_ORIGINS[props.applicationStage]?.[0] ||
          'http://localhost:3000',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.graphqlLambdaLogGroup,
    });

    gatherleSecret.grantRead(this.graphqlLambda);

    this.occurrenceMaintenanceLambdaLogGroup = new LogGroup(this, 'OccurrenceMaintenanceLambdaLogGroup', {
      logGroupName: `/aws/lambda/${occurrenceMaintenanceLambdaName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.occurrenceMaintenanceLambda = new NodejsFunction(this, 'OccurrenceMaintenanceLambdaFunction', {
      functionName: occurrenceMaintenanceLambdaName,
      description: 'Scheduled maintenance worker that tops up and repairs persisted event occurrence windows.',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.minutes(15),
      memorySize: 512,
      handler: 'maintainEventOccurrencesHandler',
      entry: pathOccurrenceMaintenanceHandlerFile,
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@gatherle.com',
        WEBAPP_URL:
          process.env.WEBAPP_URL ||
          DEFAULT_STAGE_WEBAPP_ORIGINS[props.applicationStage]?.[0] ||
          'http://localhost:3000',
        OCCURRENCE_MAINTENANCE_BATCH_LIMIT: process.env.OCCURRENCE_MAINTENANCE_BATCH_LIMIT ?? '200',
        OCCURRENCE_MAINTENANCE_THRESHOLD_DAYS: process.env.OCCURRENCE_MAINTENANCE_THRESHOLD_DAYS ?? '30',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.occurrenceMaintenanceLambdaLogGroup,
    });

    gatherleSecret.grantRead(this.occurrenceMaintenanceLambda);

    const warmUpIntervalMinutes = props.applicationStage === APPLICATION_STAGES.PROD ? 5 : 14;
    new Schedule(this, 'GraphqlLambdaWarmUpSchedule', {
      scheduleName: buildResourceName('graphql-lambda-warmup', props.applicationStage, props.awsRegion),
      description: `Keeps the GraphQL Lambda warm by invoking it every ${warmUpIntervalMinutes} minutes`,
      schedule: ScheduleExpression.rate(Duration.minutes(warmUpIntervalMinutes)),
      target: new LambdaInvoke(this.graphqlLambda, { retryAttempts: 0 }),
    });

    const occurrenceMaintenanceIntervalHours = props.applicationStage === APPLICATION_STAGES.PROD ? 6 : 12;
    new Schedule(this, 'OccurrenceMaintenanceSchedule', {
      scheduleName: buildResourceName('event-occurrence-maintenance', props.applicationStage, props.awsRegion),
      description: `Runs event occurrence maintenance every ${occurrenceMaintenanceIntervalHours} hours`,
      schedule: ScheduleExpression.rate(Duration.hours(occurrenceMaintenanceIntervalHours)),
      target: new LambdaInvoke(this.occurrenceMaintenanceLambda, { retryAttempts: 0 }),
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
        throttlingBurstLimit: graphqlApiThrottleBurstLimit,
        throttlingRateLimit: graphqlApiThrottleRateLimit,
      },
    });

    this.graphql = this.graphqlApi.root.addResource('graphql');
    this.graphql.addMethod('ANY');

    const graphqlApiWebAcl = new CfnWebACL(this, 'GraphqlApiWebAcl', {
      defaultAction: { allow: {} },
      description: `Baseline abuse protection for the ${props.applicationStage} GraphQL API.`,
      name: buildResourceName('gatherle-graphql-api-web-acl', props.applicationStage, props.awsRegion),
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: buildMetricName(`GraphqlApiWebAcl${targetSuffix}`),
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: buildResourceName('gatherle-graphql-api-rate-limit', props.applicationStage, props.awsRegion),
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: 'IP',
              evaluationWindowSec: 300,
              limit: graphqlApiWafRateLimit,
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: buildMetricName(`GraphqlApiRateLimit${targetSuffix}`),
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    new CfnWebACLAssociation(this, 'GraphqlApiWebAclAssociation', {
      resourceArn: this.graphqlApi.deploymentStage.stageArn,
      webAclArn: graphqlApiWebAcl.attrArn,
    });

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
