import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';
import {Duration, Stack, StackProps} from 'aws-cdk-lib/core';
import {join} from 'path';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';

export class GraphQLStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const pathRoot = join(__dirname, '../../../../');
        const pathPackages = join(pathRoot, 'packages');
        const pathApi = join(pathPackages, 'api');
        const pathHandlerFile = join(pathApi, 'lib', 'server.ts');

        const graphqlLambdaFunction = new NodejsFunction(this, 'GraphqlLambdaFunctionId', {
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
                loader: {
                    '.html': 'file',
                },
                nodeModules: ['bcrypt'],
            },
        });

        // TODO Uncomment when we know how this works
        // new LambdaRestApi(this, 'GraphqlRestApiId', {
        //     handler: graphqlLambdaFunction,
        // });
    }
}
