import { Construct } from 'constructs';
import { ArnFormat, CfnOutput, Duration, StackProps, Stack, Tags } from 'aws-cdk-lib';
import {
  Conditions,
  Effect,
  OpenIdConnectProvider,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';

type DeployRolePermissionProfile = 'dns' | 'runtime';

export interface GitHubDeployRoleConfig {
  roleId: string;
  roleNamePrefix: string;
  description: string;
  outputKey: string;
  permissionProfile: DeployRolePermissionProfile;
  filters?: string[];
}

export interface GitHubAuthStackProps extends StackProps {
  readonly accountNumberForNaming: string;
  readonly repositoryOwner: string;
  readonly repositoryName: string;
  readonly deployRoles: GitHubDeployRoleConfig[];
}

export class GitHubAuthStack extends Stack {
  private readonly githubDomain = 'token.actions.githubusercontent.com';
  private readonly stsService = 'sts.amazonaws.com';

  private buildRuntimeDeployPolicy(): PolicyDocument {
    const ssmParameterArns = [
      this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: 'gatherle/*',
      }),
      this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: 'cdk-bootstrap/*',
      }),
    ];
    const backendSecretArns = [
      this.formatArn({
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        service: 'secretsmanager',
        resource: 'secret',
        resourceName: 'gatherle/backend/*',
      }),
    ];
    const accountRoleArns = [
      this.formatArn({
        service: 'iam',
        region: '',
        resource: 'role',
        resourceName: '*',
      }),
    ];

    return new PolicyDocument({
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
          actions: [
            'iam:AttachRolePolicy',
            'iam:CreatePolicy',
            'iam:CreatePolicyVersion',
            'iam:CreateRole',
            'iam:CreateServiceLinkedRole',
            'iam:DeletePolicy',
            'iam:DeletePolicyVersion',
            'iam:DeleteRole',
            'iam:DeleteRolePolicy',
            'iam:DeleteServiceLinkedRole',
            'iam:DetachRolePolicy',
            'iam:GetPolicy',
            'iam:GetPolicyVersion',
            'iam:GetRole',
            'iam:GetRolePolicy',
            'iam:GetServiceLinkedRoleDeletionStatus',
            'iam:ListAttachedRolePolicies',
            'iam:ListPolicies',
            'iam:ListPolicyVersions',
            'iam:ListRolePolicies',
            'iam:ListRoles',
            'iam:PutRolePolicy',
            'iam:TagPolicy',
            'iam:TagRole',
            'iam:UntagPolicy',
            'iam:UntagRole',
            'iam:UpdateAssumeRolePolicy',
            'iam:UpdateRole',
            'iam:UpdateRoleDescription',
          ],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: accountRoleArns,
          conditions: {
            StringEquals: {
              'iam:PassedToService': [
                'lambda.amazonaws.com',
                'scheduler.amazonaws.com',
                'apigateway.amazonaws.com',
                'cloudformation.amazonaws.com',
              ],
            },
          },
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
          actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:DeleteParameter', 'ssm:PutParameter'],
          resources: ssmParameterArns,
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
          actions: [
            'secretsmanager:CreateSecret',
            'secretsmanager:DeleteSecret',
            'secretsmanager:DescribeSecret',
            'secretsmanager:GetSecretValue',
            'secretsmanager:ListSecretVersionIds',
            'secretsmanager:PutSecretValue',
            'secretsmanager:RestoreSecret',
            'secretsmanager:TagResource',
            'secretsmanager:UntagResource',
            'secretsmanager:UpdateSecret',
          ],
          resources: backendSecretArns,
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
      ],
    });
  }

  private buildDnsDeployPolicy(): PolicyDocument {
    const ssmParameterArns = [
      this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: 'cdk-bootstrap/*',
      }),
    ];

    return new PolicyDocument({
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
          actions: [
            'route53:ChangeResourceRecordSets',
            'route53:ChangeTagsForResource',
            'route53:CreateHostedZone',
            'route53:DeleteHostedZone',
            'route53:GetChange',
            'route53:GetHostedZone',
            'route53:ListHostedZones',
            'route53:ListHostedZonesByName',
            'route53:ListResourceRecordSets',
          ],
          resources: ['*'],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ssm:GetParameter', 'ssm:GetParameters'],
          resources: ssmParameterArns,
        }),
      ],
    });
  }

  private buildDeployPolicy(permissionProfile: DeployRolePermissionProfile): PolicyDocument {
    return permissionProfile === 'dns' ? this.buildDnsDeployPolicy() : this.buildRuntimeDeployPolicy();
  }

  constructor(scope: Construct, id: string, props: GitHubAuthStackProps) {
    super(scope, id, props);

    const githubProvider = new OpenIdConnectProvider(this, 'GithubActionsProvider', {
      url: `https://${this.githubDomain}`,
      clientIds: [this.stsService],
    });

    for (const deployRole of props.deployRoles) {
      const filters = deployRole.filters?.length ? deployRole.filters : ['*'];
      const subjectFilters = filters.map((filter) => `repo:${props.repositoryOwner}/${props.repositoryName}:${filter}`);
      const conditions: Conditions = {
        StringLike: {
          [`${this.githubDomain}:sub`]: subjectFilters,
          [`${this.githubDomain}:aud`]: this.stsService,
        },
      };

      const role = new Role(this, deployRole.roleId, {
        roleName: `${deployRole.roleNamePrefix}-${props.accountNumberForNaming}`,
        assumedBy: new WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, conditions),
        inlinePolicies: {
          GitHubActionsDeployPolicy: this.buildDeployPolicy(deployRole.permissionProfile),
        },
        description: deployRole.description,
        maxSessionDuration: Duration.hours(1),
      });

      new CfnOutput(this, deployRole.outputKey, {
        value: role.roleArn,
        description: `Arn for AWS IAM role with GitHub OIDC auth for ${subjectFilters.join(', ')}`,
        exportName: `${deployRole.outputKey}-${props.accountNumberForNaming}`,
      });
    }

    Tags.of(this).add('component', 'CdkGithubActionsOidcIamRole');
  }
}
