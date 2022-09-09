import {Stack, StackProps, App} from 'aws-cdk-lib';
import {UserPool, UserPoolClient, CfnIdentityPool, AccountRecovery, StringAttribute, VerificationEmailStyle} from 'aws-cdk-lib/aws-cognito';
import {CfnOutput} from 'aws-cdk-lib';
import {APP_NAME} from '../constants/appConstants';
import {CognitoAuthRole} from '../constructs/CognitoAuthRole';
import {sendPostSignUpEmail} from '../utils';

/**
 * Documentaion https://branchv60--serverless-stack.netlify.app/chapters/configure-cognito-identity-pool-in-cdk.html
 */
export class CognitoStack extends Stack {
    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        const {subject, htmlContent} = sendPostSignUpEmail();
        const userPool = new UserPool(this, `${APP_NAME}UserPool`, {
            standardAttributes: {
                preferredUsername: {required: false, mutable: true},
                email: {required: true, mutable: true},
                address: {required: true, mutable: true},
                gender: {required: true, mutable: true},
                givenName: {required: true, mutable: true},
                familyName: {required: true, mutable: true},
                birthdate: {required: true, mutable: false},
            },
            customAttributes: {
                isAdmin: new StringAttribute({mutable: true}),
            },
            passwordPolicy: {
                minLength: 6,
                requireLowercase: false,
                requireDigits: false,
                requireUppercase: false,
                requireSymbols: false,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            autoVerify: {email: true},
            selfSignUpEnabled: true,
            signInAliases: {email: true},
            userVerification: {
                emailSubject: subject,
                emailBody: htmlContent,
                emailStyle: VerificationEmailStyle.LINK,
            },
        });

        userPool.addDomain(`${APP_NAME}UserPoolDomain`, {
            cognitoDomain: {
                domainPrefix: APP_NAME.toLowerCase(),
            },
        });

        const userPoolClient = new UserPoolClient(this, `${APP_NAME}UserPoolClient`, {
            userPool,
            generateSecret: false,
            authFlows: {
                adminUserPassword: true,
                userPassword: true,
            },
        });

        const identityPool = new CfnIdentityPool(this, `${APP_NAME}IdentityPool`, {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                },
            ],
        });

        const cognitoAuthRole = new CognitoAuthRole(this, `${APP_NAME}CognitoAuthRole`, {
            identityPool,
        });

        new CfnOutput(this, `${APP_NAME}UserPoolId`, {
            value: userPool.userPoolId,
        });
        new CfnOutput(this, `${APP_NAME}UserPoolClientId`, {
            value: userPoolClient.userPoolClientId,
        });
        new CfnOutput(this, `${APP_NAME}IdentityPoolId`, {
            value: identityPool.ref,
        });
        new CfnOutput(this, `${APP_NAME}AuthRoleName`, {
            value: cognitoAuthRole.authRole.roleName,
        });
    }
}
