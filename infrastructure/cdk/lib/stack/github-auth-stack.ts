import { Construct } from 'constructs';
import { CfnOutput, Duration, StackProps, Stack, Tags } from 'aws-cdk-lib';
import {
  Conditions,
  Effect,
  OpenIdConnectProvider,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';

export interface GitHubRepositoryConfigProps {
  owner: string;
  repo: string;
  filter?: string;
  filters?: string[];
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

    const iamRepoDeployAccess = props.repositoryConfig.flatMap((repo) => {
      const filters = repo.filters?.length ? repo.filters : [repo.filter ?? '*'];
      return filters.map((filter) => `repo:${repo.owner}/${repo.repo}:${filter}`);
    });

    const conditions: Conditions = {
      StringLike: {
        [`${githubDomain}:sub`]: iamRepoDeployAccess,
        [`${githubDomain}:aud`]: stsService,
      },
    };

    const deployPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sts:GetCallerIdentity'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudformation:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['iam:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['lambda:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['logs:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudwatch:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['apigateway:*', 'apigatewayv2:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['route53:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['acm:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ssm:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['scheduler:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['events:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sqs:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ses:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['secretsmanager:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['mediaconvert:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['wafv2:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudfront:*'],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['tag:*'],
          resources: ['*'],
        }),
      ],
    });

    const role = new Role(this, 'gitHubDeployRole', {
      roleName: `githubActionsDeployRole-${props.accountNumberForNaming}`,
      assumedBy: new WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, conditions),
      inlinePolicies: {
        GitHubActionsDeployPolicy: deployPolicy,
      },
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
