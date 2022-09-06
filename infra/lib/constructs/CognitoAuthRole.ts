import {Construct} from 'constructs';
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from 'aws-cdk-lib/aws-cognito';
import {Role, FederatedPrincipal, PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';
import {APP_NAME} from '../constants/appConstants';

export interface CognitoAuthRoleProps {
    identityPool: CfnIdentityPool;
}

export class CognitoAuthRole extends Construct {
    public authRole: Role;

    constructor(scope: Construct, id: string, props: CognitoAuthRoleProps) {
        super(scope, id);

        const {identityPool} = props;

        const federatedPrincipal = new FederatedPrincipal(
            'cognito-identity.amazonaws.com',
            {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            },
            'sts:AssumeRoleWithWebIdentity',
        );

        this.authRole = new Role(this, `${APP_NAME}CognitoDefaultAuthRole`, {
            assumedBy: federatedPrincipal,
        });

        this.authRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['mobileanalytics:PutEvents', 'cognito-sync:*', 'cognito-identity:*'],
                resources: ['*'],
            }),
        );

        new CfnIdentityPoolRoleAttachment(this, `${APP_NAME}IdentityPoolRoleAttachment`, {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: this.authRole.roleArn,
                unauthenticated: this.authRole.roleArn,
            },
        });
    }
}
