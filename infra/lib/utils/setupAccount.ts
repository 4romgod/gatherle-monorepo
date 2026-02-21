import { App } from 'aws-cdk-lib';
import {
  GraphQLStack,
  SecretsManagementStack,
  S3BucketStack,
  MonitoringDashboardStack,
  WebSocketApiStack,
} from '../stack';
import { ServiceAccount } from '../constants';
import { buildStackName } from './naming';

export const setupServiceAccount = (app: App, account: ServiceAccount) => {
  const enableCustomDomains = process.env.ENABLE_CUSTOM_DOMAINS === 'true';
  const stackEnv = {
    account: account.accountNumber,
    region: account.awsRegion,
  };

  const secretsManagementStack = new SecretsManagementStack(app, 'SecretsManagementStack', {
    env: stackEnv,
    stackName: buildStackName('secrets-management', account.applicationStage, account.awsRegion),
    applicationStage: account.applicationStage,
    awsRegion: account.awsRegion,
    description: 'This stack includes AWS Secrets Manager resources for the GraphQL API',
  });

  const s3BucketStack = new S3BucketStack(app, 'S3BucketStack', {
    env: stackEnv,
    stackName: buildStackName('s3-bucket', account.applicationStage, account.awsRegion),
    applicationStage: account.applicationStage,
    awsRegion: account.awsRegion,
    description: 'This stack includes S3 bucket for storing user-uploaded images',
  });

  const graphqlStack = new GraphQLStack(app, 'GraphQLStack', {
    env: stackEnv,
    stackName: buildStackName('graphql', account.applicationStage, account.awsRegion),
    applicationStage: account.applicationStage,
    awsRegion: account.awsRegion,
    enableCustomDomains,
    s3BucketName: s3BucketStack.imagesBucket.bucketName,
    description: 'This stack includes infrastructure for the GraphQL API. This includes serverless resources.',
  });

  graphqlStack.addDependency(secretsManagementStack);
  graphqlStack.addDependency(s3BucketStack);

  const webSocketApiStack = new WebSocketApiStack(app, 'WebSocketApiStack', {
    env: stackEnv,
    stackName: buildStackName('websocket-api', account.applicationStage, account.awsRegion),
    applicationStage: account.applicationStage,
    awsRegion: account.awsRegion,
    enableCustomDomains,
    stageHostedZone: graphqlStack.stageHostedZone,
    stageDomainCertificate: graphqlStack.stageDomainCertificate,
    description: 'This stack includes infrastructure for websocket routes used by realtime features.',
  });

  webSocketApiStack.addDependency(secretsManagementStack);
  webSocketApiStack.addDependency(graphqlStack);

  // Grant Lambda permissions to access S3 bucket
  s3BucketStack.imagesBucket.grantReadWrite(graphqlStack.graphqlLambda);

  // Create monitoring dashboard
  const monitoringStack = new MonitoringDashboardStack(app, 'MonitoringDashboardStack', {
    env: stackEnv,
    stackName: buildStackName('monitoring-dashboard', account.applicationStage, account.awsRegion),
    applicationStage: account.applicationStage,
    awsRegion: account.awsRegion,
    graphqlLambdaFunction: graphqlStack.graphqlLambda,
    graphqlLambdaLogGroup: graphqlStack.graphqlLambdaLogGroup,
    graphqlApiAccessLogGroup: graphqlStack.graphqlApiAccessLogGroup,
    websocketLambdaFunction: webSocketApiStack.websocketLambda,
    websocketLambdaLogGroup: webSocketApiStack.websocketLambdaLogGroup,
    websocketApi: webSocketApiStack.websocketApi,
    websocketStage: webSocketApiStack.websocketStage,
    description: 'This stack includes CloudWatch dashboards for monitoring both the GraphQL and WebSocket APIs',
  });

  monitoringStack.addDependency(graphqlStack);
  monitoringStack.addDependency(webSocketApiStack);
};
