import {App} from 'aws-cdk-lib';
import {ALPHA_DUB, GITHUB, SERVICE_ACCOUNTS, ServiceAccount} from './constants';
import {APP_NAME} from './constants';
import {CognitoStack} from './stacks/CognitoStack';
import {FargateStack} from './stacks/FargateStack';
import {capitalize} from './utils';

const app = new App();

SERVICE_ACCOUNTS.forEach(({awsAccountId, awsRegion, stage}: ServiceAccount) => {
    const capitalizedStage = capitalize(stage);

    const cognitoStack = new CognitoStack(app, `${APP_NAME}${capitalizedStage}CognitoStack`, {
        stage,
        env: {
            account: ALPHA_DUB.awsAccountId,
            region: ALPHA_DUB.awsRegion,
        },
    });

    const fargateStack = new FargateStack(app, `${APP_NAME}${capitalizedStage}FargateStack`, {
        stage,
        disambiguator: 'Api',
        ecrRepositoryName: `${APP_NAME.toLowerCase()}-api-ecr-repo`,
        github: {
            repoOwner: GITHUB.owner,
            repoName: GITHUB.repoNameAPI,
            token: GITHUB.accessToken,
            branch: 'master',
        },
        env: {
            account: awsAccountId,
            region: awsRegion,
        },
    });

    fargateStack.addDependency(cognitoStack, 'Fargate Stack needs some exported params from Cognito Stack');
});
