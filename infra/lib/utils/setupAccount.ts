import { App } from 'aws-cdk-lib';
import {
  GitHubActionsAwsAuthStack,
  GraphQLStack,
  SecretsManagementStack,
  S3BucketStack,
  MonitoringDashboardStack,
  WebSocketApiStack,
} from '../stack';
import { ServiceAccount } from '../constants';
import { buildAccountScopedStackName, buildStackName } from './naming';

export const setupServiceAccount = (app: App, account: ServiceAccount) => {
  const stackEnv = {
    account: account.accountNumber,
    region: account.awsRegion,
  };

  if (account.bootstrapAuthStack) {
    new GitHubActionsAwsAuthStack(app, 'GitHubActionsAwsAuthStack', {
      env: stackEnv,
      stackName: buildAccountScopedStackName('github-actions-auth', account.accountNumber),
      accountNumberForNaming: account.accountNumber,
      repositoryConfig: [
        {
          owner: '4romgod',
          repo: 'gatherle-monorepo',
        },
      ],
      description: 'This stack includes resources needed by GitHub Actions (CI/CD) to deploy AWS CDK Stacks',
    });
  }

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
    description: 'This stack includes infrastructure for websocket routes used by realtime features.',
  });

  webSocketApiStack.addDependency(secretsManagementStack);

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
