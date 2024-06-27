import {App} from 'aws-cdk-lib';
import {GraphQLStack} from './stack';
import {BETA} from './constants';

const app = new App();

const graphqlStack = new GraphQLStack(app, 'GraphqlStackId', {
    env: {
        account: BETA.accountNumber,
        region: BETA.awsRegion,
    },
});
