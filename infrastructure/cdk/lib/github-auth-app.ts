import { App } from 'aws-cdk-lib';
import { DNS_STACK_CONFIG } from './constants';
import { GitHubAuthStack } from './stack';
import { buildAccountScopedStackName } from './utils';

const app = new App();
const deploymentRegion = process.env.AWS_REGION;
const targetAccountId = process.env.TARGET_AWS_ACCOUNT_ID;

if (!deploymentRegion || !targetAccountId) {
  throw new Error(
    'Missing GitHub auth deployment configuration. Provide `AWS_REGION` and `TARGET_AWS_ACCOUNT_ID`. Example: ' +
      '`AWS_REGION=af-south-1 TARGET_AWS_ACCOUNT_ID=327319899143 npm run cdk:github-auth -w @gatherle/cdk -- deploy GitHubAuthStack --require-approval never --exclusively`.',
  );
}

const deployRoles =
  targetAccountId === DNS_STACK_CONFIG.accountNumber
    ? [
        {
          roleId: 'GithubDnsDeployRole',
          roleNamePrefix: 'githubActionsDnsDeployRole',
          description: 'GitHub Actions DNS deploy role for the Gatherle root hosted zone account',
          outputKey: 'GithubActionDnsDeployRoleArn',
          permissionProfile: 'dns' as const,
          filters: [`environment:dns-${deploymentRegion}`],
        },
      ]
    : [
        {
          roleId: 'GithubBetaRuntimeDeployRole',
          roleNamePrefix: 'githubActionsBetaDeployRole',
          description: 'GitHub Actions runtime deploy role for Gatherle Beta infrastructure',
          outputKey: 'GithubActionBetaDeployRoleArn',
          permissionProfile: 'runtime' as const,
          filters: [`environment:Beta-${deploymentRegion}`],
        },
        {
          roleId: 'GithubProdRuntimeDeployRole',
          roleNamePrefix: 'githubActionsProdDeployRole',
          description: 'GitHub Actions runtime deploy role for Gatherle Prod infrastructure',
          outputKey: 'GithubActionProdDeployRoleArn',
          permissionProfile: 'runtime' as const,
          filters: [`environment:Prod-${deploymentRegion}`],
        },
      ];

new GitHubAuthStack(app, 'GitHubAuthStack', {
  env: {
    account: targetAccountId,
    region: deploymentRegion,
  },
  stackName: buildAccountScopedStackName('github-auth', targetAccountId),
  accountNumberForNaming: targetAccountId,
  repositoryOwner: '4romgod',
  repositoryName: 'gatherle-monorepo',
  deployRoles,
  description: 'This stack includes resources needed by GitHub Actions (CI/CD) to deploy AWS CDK stacks',
});

app.synth();
