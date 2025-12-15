import {AccessLogFormat, LambdaRestApi, LogGroupLogDestination, ResourceBase, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {CfnOutput, Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib/core';
import {configDotenv} from 'dotenv';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Construct} from 'constructs';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {APPLICATION_STAGES} from '@ntlango/commons';
import {join} from 'path';

configDotenv();

const pathRoot = join(__dirname, '../../../');
const pathApi = join(pathRoot, 'apps', 'api');
const pathHandlerFile = join(pathApi, 'lib', 'graphql', 'apollo', 'lambdaHandler.ts');

export class GraphQLStack extends Stack {
  readonly graphqlLambda: NodejsFunction;
  readonly graphqlApi: RestApi;
  readonly graphql: ResourceBase;
  readonly graphqlApiPathOutput: CfnOutput;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const ntlangoSecret = Secret.fromSecretNameV2(this, 'ImportedSecret', `${process.env.STAGE}/ntlango/graphql-api`);

    this.graphqlLambda = new NodejsFunction(this, 'GraphqlLambdaFunctionId', {
      functionName: 'GraphqlLambdaFunction',
      description: 'This lambda function is a GraphQL Lambda that uses Apollo server: https://www.apollographql.com/docs/apollo-server/deployment/lambda',
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      memorySize: 256,
      handler: 'graphqlLambdaHandler',
      entry: pathHandlerFile,
      projectRoot: pathApi,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: true,
        externalModules: ['mock-aws-s3', 'aws-sdk', 'nock'],
        loader: {'.html': 'file'},
      },
      environment: {
        STAGE: `${process.env.STAGE}`,
        NTLANGO_SECRET_ARN: ntlangoSecret.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    ntlangoSecret.grantRead(this.graphqlLambda);

    const accessLogDestination = new LogGroup(this, 'GraphqlRestApiAccessLogs', {
      logGroupName: 'GraphqlRestApiAccessLogs',
      removalPolicy: APPLICATION_STAGES.PROD == process.env.STAGE ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.graphqlApi = new LambdaRestApi(this, 'GraphqlRestApiId', {
      handler: this.graphqlLambda,
      proxy: false,
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(accessLogDestination),
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
