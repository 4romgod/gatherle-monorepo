import {Stack, App} from 'aws-cdk-lib';
import {UserPool, UserPoolClient, CfnIdentityPool, AccountRecovery, StringAttribute, VerificationEmailStyle} from 'aws-cdk-lib/aws-cognito';
import {CfnOutput} from 'aws-cdk-lib';
import {APP_NAME, NtlangoStackProps} from '../constants';
import {CognitoAuthRole} from '../constructs/CognitoAuthRole';
import {capitalize, postSignUpEmail} from '../utils';

export type CognitoStackProps = NtlangoStackProps;

/**
 * Inspired by https://branchv60--serverless-stack.netlify.app/chapters/configure-cognito-identity-pool-in-cdk.html
 */
export class CognitoStack extends Stack {
    constructor(scope: App, id: string, props: CognitoStackProps) {
        super(scope, id, props);

        const {stage} = props;
        const capitalizedStage = capitalize(stage);

        const {subject, htmlContent} = postSignUpEmail();
        const userPool = new UserPool(this, `${APP_NAME}${capitalizedStage}UserPoolId`, {
            standardAttributes: {
                address: {
                    required: true,
                    mutable: true,
                },
                birthdate: {
                    required: true,
                    mutable: false,
                },
                email: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
                gender: {
                    required: false,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                lastUpdateTime: {
                    required: false,
                    mutable: true,
                },
                phoneNumber: {
                    required: false,
                    mutable: true,
                },
                preferredUsername: {
                    required: false,
                    mutable: true,
                },
                profilePage: {
                    required: false,
                    mutable: true,
                },
                profilePicture: {
                    required: false,
                    mutable: true,
                },
                website: {
                    required: false,
                    mutable: true,
                },
            },
            customAttributes: {
                role: new StringAttribute({
                    mutable: true,
                }),
            },
            passwordPolicy: {
                minLength: 6,
                requireLowercase: false,
                requireDigits: false,
                requireUppercase: false,
                requireSymbols: false,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            autoVerify: {
                email: true,
            },
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            userVerification: {
                emailSubject: subject,
                emailBody: htmlContent,
                emailStyle: VerificationEmailStyle.LINK,
            },
        });

        userPool.addDomain(`${APP_NAME}${capitalizedStage}UserPoolDomainId`, {
            cognitoDomain: {
                domainPrefix: APP_NAME.toLowerCase(),
            },
        });

        const userPoolClient = new UserPoolClient(this, `${APP_NAME}${capitalizedStage}UserPoolClientId`, {
            userPool,
            generateSecret: false,
            authFlows: {
                adminUserPassword: true,
                userPassword: true,
            },
        });

        const identityPool = new CfnIdentityPool(this, `${APP_NAME}${capitalizedStage}IdentityPoolId`, {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                },
            ],
        });

        const cognitoAuthRole = new CognitoAuthRole(this, `${APP_NAME}${capitalizedStage}CognitoAuthRoleId`, {
            identityPool,
        });

        new CfnOutput(this, `${APP_NAME}${capitalizedStage}ExportedUserPoolId`, {
            value: userPool.userPoolId,
            exportName: `${APP_NAME}${capitalizedStage}ExportedUserPool`,
        });

        new CfnOutput(this, `${APP_NAME}${capitalizedStage}ExportedUserPoolClientId`, {
            value: userPoolClient.userPoolClientId,
            exportName: `${APP_NAME}${capitalizedStage}ExportedUserPoolClient`,
        });

        new CfnOutput(this, `${APP_NAME}${capitalizedStage}ExportedIdentityPoolId`, {
            value: identityPool.ref,
            exportName: `${APP_NAME}${capitalizedStage}ExportedIdentityPool`,
        });

        new CfnOutput(this, `${APP_NAME}${capitalizedStage}ExportedAuthRoleArnId`, {
            value: cognitoAuthRole.authRole.roleArn,
            exportName: `${APP_NAME}${capitalizedStage}ExportedAuthRoleArn`,
        });
    }
}
