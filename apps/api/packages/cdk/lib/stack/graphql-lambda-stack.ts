import {AccessLogFormat, LambdaRestApi, LogGroupLogDestination, ResourceBase, RestApi, StageOptions} from 'aws-cdk-lib/aws-apigateway';
import {CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib/core';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Construct} from 'constructs';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {config} from 'dotenv';
import {join} from 'path';

const pathRoot = join(__dirname, '../../../../');
const pathPackages = join(pathRoot, 'packages');
const pathApi = join(pathPackages, 'api');
const pathHandlerFile = join(pathApi, 'lib', 'index.ts');

config({path: join(pathRoot, '.env')});

export class GraphQLStack extends Stack {
    readonly graphqlLambda: NodejsFunction;
    readonly graphqlApi: RestApi;
    readonly graphql: ResourceBase;
    readonly graphqlApiPathOutput: CfnOutput;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.graphqlLambda = new NodejsFunction(this, 'GraphqlLambdaFunctionId', {
            functionName: 'GraphqlLambdaFunction',
            projectRoot: pathRoot,
            entry: pathHandlerFile,
            handler: 'graphqlLambdaHandler',
            depsLockFilePath: join(pathRoot, 'package-lock.json'),
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(10),
            memorySize: 256,
            bundling: {
                tsconfig: join(pathApi, 'tsconfig.json'),
                sourceMap: true,
                minify: true,
                externalModules: ['mock-aws-s3', 'aws-sdk', 'nock'],
                loader: {'.html': 'file'},
                nodeModules: ['bcrypt'],
            },
            environment: {
                API_DOMAIN: `${process.env.API_DOMAIN}`,
                API_PORT: `${process.env.API_PORT}`,
                MONGO_DB_URL: `${process.env.MONGO_DB_URL}`,
                NODE_ENV: `${process.env.NODE_ENV}`,
                JWT_SECRET: `${process.env.JWT_SECRET}`,
                BCRYPT_SALT: `${process.env.BCRYPT_SALT}`,
            },
        });

        this.graphqlApi = new LambdaRestApi(this, 'GraphqlRestApiId', {
            handler: this.graphqlLambda,
            proxy: false,
            deployOptions: {
                accessLogDestination: new LogGroupLogDestination(new LogGroup(this, 'GraphqlRestApiAccessLogs')),
                accessLogFormat: AccessLogFormat.clf(),
                stageName: `${process.env.NODE_ENV}`,
            },
        });

        this.graphql = this.graphqlApi.root.addResource('graphql');
        this.graphql.addMethod('ANY');

        this.graphqlApiPathOutput = new CfnOutput(this, 'apiPath', {
            value: this.graphqlApi.root.path,
            description: 'Path of the API',
        });
    }
}
