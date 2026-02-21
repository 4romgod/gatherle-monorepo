import { Construct } from 'constructs';
import { CfnOutput, Duration, StackProps, Stack, Tags } from 'aws-cdk-lib';
import { OpenIdConnectProvider, Conditions, ManagedPolicy, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam';

export interface GitHubRepositoryConfigProps {
  owner: string;
  repo: string;
  filter?: string;
}

export interface GitHubAuthStackProps extends StackProps {
  readonly accountNumberForNaming: string;
  readonly repositoryConfig: GitHubRepositoryConfigProps[];
}

export class GitHubAuthStack extends Stack {
  constructor(scope: Construct, id: string, props: GitHubAuthStackProps) {
    super(scope, id, props);

    const githubDomain = 'token.actions.githubusercontent.com';
    const stsService = 'sts.amazonaws.com';

    const githubProvider = new OpenIdConnectProvider(this, 'GithubActionsProvider', {
      url: `https://${githubDomain}`,
      clientIds: [stsService],
    });

    const iamRepoDeployAccess = props.repositoryConfig.map(
      (repo) => `repo:${repo.owner}/${repo.repo}:${repo.filter ?? '*'}`,
    );

    const conditions: Conditions = {
      StringLike: {
        [`${githubDomain}:sub`]: iamRepoDeployAccess,
        [`${githubDomain}:aud`]: stsService,
      },
    };

    const role = new Role(this, 'gitHubDeployRole', {
      roleName: `githubActionsDeployRole-${props.accountNumberForNaming}`,
      assumedBy: new WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, conditions),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
      description: 'This role is used via GitHub Actions to deploy with AWS CDK or Terraform on the target AWS account',
      maxSessionDuration: Duration.hours(1),
    });

    new CfnOutput(this, 'GithubActionOidcIamRoleArn', {
      value: role.roleArn,
      description: `Arn for AWS IAM role with Github OIDC auth for ${iamRepoDeployAccess}`,
      exportName: `GithubActionOidcIamRoleArn-${props.accountNumberForNaming}`,
    });

    Tags.of(this).add('component', 'CdkGithubActionsOidcIamRole');
  }
}
