import { App } from 'aws-cdk-lib';
import {
  GitHubActionsAwsAuthStack,
  GraphQLStack,
  SecretsManagementStack,
  S3BucketStack,
  MonitoringDashboardStack,
} from '../stack';
import { ServiceAccount } from '../constants';

export const setupServiceAccount = (app: App, account: ServiceAccount) => {
  new GitHubActionsAwsAuthStack(app, 'GitHubActionsAwsAuthStack', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    repositoryConfig: [
      {
        owner: '4romgod',
        repo: 'ntlango-monorepo',
      },
    ],
    description: 'This stack includes resources needed by GitHub Actions (CI/CD) to deploy AWS CDK Stacks',
  });

  const secretsManagementStack = new SecretsManagementStack(app, 'SecretsManagementStack', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    description: 'This stack includes AWS Secrets Manager resources for the GraphQL API',
  });

  const s3BucketStack = new S3BucketStack(app, 'S3BucketStack', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    description: 'This stack includes S3 bucket for storing user-uploaded images',
  });

  const graphqlStack = new GraphQLStack(app, 'GraphQLStack', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    s3BucketName: s3BucketStack.imagesBucket.bucketName,
    description: 'This stack includes infrastructure for the GraphQL API. This includes serverless resources.',
  });

  graphqlStack.addDependency(secretsManagementStack);
  graphqlStack.addDependency(s3BucketStack);

  // Grant Lambda permissions to access S3 bucket
  s3BucketStack.imagesBucket.grantReadWrite(graphqlStack.graphqlLambda);

  // Create monitoring dashboard
  const monitoringStack = new MonitoringDashboardStack(app, 'MonitoringDashboardStack', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    lambdaFunction: graphqlStack.graphqlLambda,
    lambdaLogGroup: graphqlStack.lambdaLogGroup,
    apiAccessLogGroup: graphqlStack.apiAccessLogGroup,
    description: 'This stack includes CloudWatch dashboards and alarms for monitoring the GraphQL API',
  });

  monitoringStack.addDependency(graphqlStack);
};
