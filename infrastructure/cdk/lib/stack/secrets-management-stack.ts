import { SecretValue, StackProps, Stack } from 'aws-cdk-lib';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { configDotenv } from 'dotenv';
import { buildBackendSecretName } from '../utils/naming';

configDotenv();

export interface SecretsManagementStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  mongoDbUrl: string;
  jwtSecret: string;
}

export class SecretsManagementStack extends Stack {
  public readonly gatherleSecret: ISecret;

  constructor(scope: Construct, id: string, props: SecretsManagementStackProps) {
    super(scope, id, props);

    this.gatherleSecret = new Secret(this, 'backendSecret', {
      secretName: buildBackendSecretName(props.applicationStage, props.awsRegion),
      description: 'Gatherle backend secrets',
      secretObjectValue: {
        MONGO_DB_URL: SecretValue.unsafePlainText(props.mongoDbUrl),
        JWT_SECRET: SecretValue.unsafePlainText(props.jwtSecret),
      },
    });
  }
}
