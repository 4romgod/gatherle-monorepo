import {
  AccessLogFormat,
  LambdaRestApi,
  LogGroupLogDestination,
  ResourceBase,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { configDotenv } from 'dotenv';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { APPLICATION_STAGES } from '@ntlango/commons';
import { join } from 'path';

configDotenv();

const pathRoot = join(__dirname, '../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'dist', 'apps', 'api', 'lib', 'graphql', 'apollo', 'lambdaHandler.js');

export interface GraphQLStackProps extends StackProps {
  s3BucketName?: string;
}

export class GraphQLStack extends Stack {
  readonly graphqlLambda: NodejsFunction;
  readonly graphqlApi: RestApi;
  readonly graphql: ResourceBase;
  readonly graphqlApiPathOutput: CfnOutput;
  readonly lambdaLogGroup: LogGroup;
  readonly apiAccessLogGroup: LogGroup;

  constructor(scope: Construct, id: string, props: GraphQLStackProps) {
    super(scope, id, props);

    const ntlangoSecret = Secret.fromSecretNameV2(this, 'ImportedSecret', `${process.env.STAGE}/ntlango/graphql-api`);

    this.lambdaLogGroup = new LogGroup(this, 'GraphqlLambdaLogGroup', {
      logGroupName: '/aws/lambda/GraphqlLambdaFunction',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.graphqlLambda = new NodejsFunction(this, 'GraphqlLambdaFunction', {
      functionName: 'GraphqlLambdaFunction',
      description:
        'This lambda function is a GraphQL Lambda that uses Apollo server: https://www.apollographql.com/docs/apollo-server/deployment/lambda',
      runtime: Runtime.NODEJS_20_X,
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
        STAGE: `${process.env.STAGE}`, // TODO fix CI/CD to pass this env variable
        NTLANGO_SECRET_ARN: ntlangoSecret.secretArn,
        S3_BUCKET_NAME: props.s3BucketName || '',
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: this.lambdaLogGroup,
    });

    ntlangoSecret.grantRead(this.graphqlLambda);

    this.apiAccessLogGroup = new LogGroup(this, 'GraphqlRestApiAccessLogs', {
      logGroupName: 'GraphqlRestApiAccessLogs',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.graphqlApi = new LambdaRestApi(this, 'GraphqlRestApiId', {
      handler: this.graphqlLambda,
      proxy: false,
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(this.apiAccessLogGroup),
        accessLogFormat: AccessLogFormat.clf(),
        stageName: `${process.env.STAGE}`.toLowerCase(),
      },
    });

    this.graphql = this.graphqlApi.root.addResource('graphql');
    this.graphql.addMethod('ANY');

    const graphqlApiEndpoint = this.graphqlApi.urlForPath('/graphql');
    this.graphqlApiPathOutput = new CfnOutput(this, 'apiPath', {
      value: graphqlApiEndpoint,
      description: 'The URL of the GraphQL API',
      exportName: 'GraphQLApiEndpoint',
    });
  }
}
