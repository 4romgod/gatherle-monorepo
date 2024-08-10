import {AccessLogFormat, LambdaRestApi, LogGroupLogDestination, ResourceBase, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib/core';
import {configDotenv} from 'dotenv';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Construct} from 'constructs';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {join} from 'path';
import {SecretsManagementStack} from './secrets-management-stack';

const pathRoot = join(__dirname, '../../../../');
const pathPackages = join(pathRoot, 'packages');
const pathApi = join(pathPackages, 'api');
const pathHandlerFile = join(pathApi, 'lib', 'index.ts');

configDotenv({path: join(pathRoot, '.env')});

interface GraphQLStackProps extends StackProps {
    secretsStack: SecretsManagementStack;
}

export class GraphQLStack extends Stack {
    readonly graphqlLambda: NodejsFunction;
    readonly graphqlApi: RestApi;
    readonly graphql: ResourceBase;
    readonly graphqlApiPathOutput: CfnOutput;

    constructor(scope: Construct, id: string, props: GraphQLStackProps) {
        super(scope, id, props);

        const {secretsStack} = props;

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
                NODE_ENV: `${process.env.NODE_ENV}`,
                NTLANGO_SECRET_ARN: secretsStack.ntlangoSecret.secretArn,
            },
        });

        secretsStack.ntlangoSecret.grantRead(this.graphqlLambda);

        this.graphqlApi = new LambdaRestApi(this, 'GraphqlRestApiId', {
            handler: this.graphqlLambda,
            proxy: false,
            cloudWatchRole: true,
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
