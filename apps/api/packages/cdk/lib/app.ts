import {App} from 'aws-cdk-lib';
import {GitHubActionsAwsAuthStack, GraphQLStack} from './stack';
import {BETA} from './constants';

const app = new App();

const githubStack = new GitHubActionsAwsAuthStack(app, 'GitHubActionsAwsAuthStackId', {
    env: {
        account: BETA.accountNumber,
        region: BETA.awsRegion,
    },
    repositoryConfig: [
        {
            owner: '4romgod',
            repo: 'ntlango-backend',
        },
    ],
});

const graphqlStack = new GraphQLStack(app, 'GraphqlStackId', {
    env: {
        account: BETA.accountNumber,
        region: BETA.awsRegion,
    },
});
