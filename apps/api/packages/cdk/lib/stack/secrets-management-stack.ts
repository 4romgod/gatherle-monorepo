import {StackProps, Stack} from 'aws-cdk-lib';
import {ISecret, Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {Construct} from 'constructs';
import {configDotenv} from 'dotenv';

configDotenv();

export class SecretsManagementStack extends Stack {
  public readonly ntlangoSecret: ISecret;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.ntlangoSecret = new Secret(this, 'ntlangoSecret', {
      secretName: `${process.env.STAGE}/ntlango/graphql-api`,
      description: 'Ntlango Secrets',
    });
  }
}
