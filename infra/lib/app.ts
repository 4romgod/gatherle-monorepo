import {App} from 'aws-cdk-lib';
import {ALPHA_DUB} from './accounts';
import {APP_NAME} from './constants/appConstants';
import {CognitoStack} from './stacks/CognitoStack';

const app = new App();

new CognitoStack(app, `${APP_NAME}CognitoStack`, {
    env: {
        account: ALPHA_DUB.awsAccountId,
        region: ALPHA_DUB.awsRegion,
    },
});
