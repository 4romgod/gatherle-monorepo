import { SecretValue, StackProps, Stack } from 'aws-cdk-lib';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { configDotenv } from 'dotenv';
import { buildBackendSecretName } from '../utils/naming';

configDotenv();

export interface SecretsManagementStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
}

export class SecretsManagementStack extends Stack {
  public readonly gatherleSecret: ISecret;

  constructor(scope: Construct, id: string, props: SecretsManagementStackProps) {
    super(scope, id, props);

    this.gatherleSecret = new Secret(this, 'backendSecret', {
      secretName: buildBackendSecretName(props.applicationStage, props.awsRegion),
      description: 'Gatherle backend secrets',
      secretObjectValue: {
        MONGO_DB_URL: SecretValue.unsafePlainText(process.env.MONGO_DB_URL ?? ''),
        JWT_SECRET: SecretValue.unsafePlainText(process.env.JWT_SECRET ?? ''),
      },
    });
  }
}
