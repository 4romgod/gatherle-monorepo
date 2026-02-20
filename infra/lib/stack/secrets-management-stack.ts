import { SecretValue, StackProps, Stack } from 'aws-cdk-lib';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { configDotenv } from 'dotenv';

configDotenv();

export class SecretsManagementStack extends Stack {
  public readonly gatherleSecret: ISecret;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const stageSegment = `${process.env.STAGE ?? 'Beta'}`.toLowerCase();

    this.gatherleSecret = new Secret(this, 'backendSecret', {
      secretName: `gatherle/backend/${stageSegment}`,
      description: 'Gatherle backend secrets',
      secretObjectValue: {
        MONGO_DB_URL: SecretValue.unsafePlainText(process.env.MONGO_DB_URL ?? ''),
        JWT_SECRET: SecretValue.unsafePlainText(process.env.JWT_SECRET ?? ''),
      },
    });
  }
}
