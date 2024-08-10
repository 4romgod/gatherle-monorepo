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
                repo: 'ntlango-backend',
            },
        ],
    });

    const secretsManagementStack = new SecretsManagementStack(app, 'SecretsManagementStackId', {
        env: {
            account: account.accountNumber,
            region: account.awsRegion,
        },
    });

    const graphqlStack = new GraphQLStack(app, 'GraphqlStackId', {
        env: {
            account: account.accountNumber,
            region: account.awsRegion,
        },
        secretsStack: secretsManagementStack,
    });

    graphqlStack.addDependency(secretsManagementStack);
};
