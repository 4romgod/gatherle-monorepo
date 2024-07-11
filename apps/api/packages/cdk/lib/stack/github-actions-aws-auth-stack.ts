import {Construct} from 'constructs';
import {CfnOutput, Duration, StackProps, Stack, Tags} from 'aws-cdk-lib';
import {OpenIdConnectProvider, Conditions, ManagedPolicy, Role, WebIdentityPrincipal} from 'aws-cdk-lib/aws-iam';

export interface GitHubRepositoryConfigProps {
    owner: string;
    repo: string;
    filter?: string;
}

export interface GitHubActionsAwsAuthStackProps extends StackProps {
    readonly repositoryConfig: GitHubRepositoryConfigProps[];
}

export class GitHubActionsAwsAuthStack extends Stack {
    constructor(scope: Construct, id: string, props: GitHubActionsAwsAuthStackProps) {
        super(scope, id, props);

        const githubDomain = 'token.actions.githubusercontent.com';
        const stsService = 'sts.amazonaws.com';

        const githubProvider = new OpenIdConnectProvider(this, 'GithubActionsProvider', {
            url: `https://${githubDomain}`,
            clientIds: [stsService],
        });

        const iamRepoDeployAccess = props.repositoryConfig.map((repo) => `repo:${repo.owner}/${repo.repo}:${repo.filter ?? '*'}`);

        const conditions: Conditions = {
            StringLike: {
                [`${githubDomain}:sub`]: iamRepoDeployAccess,
                [`${githubDomain}:aud`]: stsService,
            },
        };

        const role = new Role(this, 'gitHubDeployRoleId', {
            roleName: 'githubActionsDeployRole',
            assumedBy: new WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, conditions),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
            description: 'This role is used via GitHub Actions to deploy with AWS CDK or Terraform on the target AWS account',
            maxSessionDuration: Duration.hours(12),
        });

        new CfnOutput(this, 'GithubActionOidcIamRoleArn', {
            value: role.roleArn,
            description: `Arn for AWS IAM role with Github OIDC auth for ${iamRepoDeployAccess}`,
            exportName: 'GithubActionOidcIamRoleArn',
        });

        Tags.of(this).add('component', 'CdkGithubActionsOidcIamRole');
    }
}
