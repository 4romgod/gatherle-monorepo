import {App} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {CognitoStack} from '../../lib/stacks/CognitoStack';

let template: Template;

describe('CognitoStack', () => {
    beforeAll(() => {
        const app = new App();
        const cognitoStack = new CognitoStack(app, 'cognitoStackId', {stage: 'test'});
        template = Template.fromStack(cognitoStack);
    });

    test('CognitoStack Created', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {});
        template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });
});
