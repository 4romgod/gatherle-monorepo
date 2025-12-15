import {App} from 'aws-cdk-lib';
import {GitHubActionsAwsAuthStack, GraphQLStack, SecretsManagementStack} from '../stack';
import {ServiceAccount} from '../constants';

export const setupServiceAccount = (app: App, account: ServiceAccount) => {
  const githubStack = new GitHubActionsAwsAuthStack(app, 'GitHubActionsAwsAuthStackId', {
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

  const secretsManagementStack = new SecretsManagementStack(app, 'SecretsManagementStackId', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    description: 'This stack includes AWS Secrets Manager resources for the GraphQL API',
  });

  const graphqlStack = new GraphQLStack(app, 'GraphqlStackId', {
    env: {
      account: account.accountNumber,
      region: account.awsRegion,
    },
    description: 'This stack includes infrastructure for the GraphQL API. This includes serverless resources.',
  });

  graphqlStack.addDependency(secretsManagementStack);
};
