import {StackProps, Stack} from 'aws-cdk-lib';
import {ISecret, Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {Construct} from 'constructs';

export class SecretsManagementStack extends Stack {
    public readonly ntlangoSecret: ISecret;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.ntlangoSecret = new Secret(this, 'ntlangoSecret', {
            secretName: `${process.env.NODE_ENV}/ntlango/graphql-api`,
            description: 'Ntlango Secrets',
        });
    }
}
