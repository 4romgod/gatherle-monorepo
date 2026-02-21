import { App } from 'aws-cdk-lib';
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

new GitHubAuthStack(app, 'GitHubAuthStack', {
  env: {
    account: targetAccountId,
    region: deploymentRegion,
  },
  stackName: buildAccountScopedStackName('github-auth', targetAccountId),
  accountNumberForNaming: targetAccountId,
  repositoryConfig: [
    {
      owner: '4romgod',
      repo: 'gatherle-monorepo',
    },
  ],
  description: 'This stack includes resources needed by GitHub Actions (CI/CD) to deploy AWS CDK stacks',
});

app.synth();
