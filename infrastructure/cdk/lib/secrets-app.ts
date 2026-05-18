import { App } from 'aws-cdk-lib';
import { resolveServiceAccount } from './constants/accounts';
import { SecretsManagementStack } from './stack/secrets-management-stack';
import { buildStackName } from './utils/naming';

const app = new App();

const deploymentStage = process.env.STAGE;
const deploymentRegion = process.env.AWS_REGION;
const requireNonEmptyEnv = (name: 'JWT_SECRET' | 'MONGO_DB_URL'): string => {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `Missing secret value for ${name}. Provide a non-empty ${name} before deploying SecretsManagementStack.`,
    );
  }

  return value.trim();
};

if (!deploymentStage || !deploymentRegion) {
  throw new Error(
    'Missing deployment target configuration. Provide both stage and region via `STAGE` and `AWS_REGION`. Example: ' +
      "`STAGE=Beta AWS_REGION=af-south-1 MONGO_DB_URL='<mongo-url-with-db-name>' JWT_SECRET='<jwt-secret>' npm run cdk:secrets -w @gatherle/cdk -- deploy SecretsManagementStack --require-approval never --exclusively`.",
  );
}

const mongoDbUrl = requireNonEmptyEnv('MONGO_DB_URL');
const jwtSecret = requireNonEmptyEnv('JWT_SECRET');

const serviceAccount = resolveServiceAccount(deploymentStage, deploymentRegion);

new SecretsManagementStack(app, 'SecretsManagementStack', {
  env: {
    account: serviceAccount.accountNumber,
    region: serviceAccount.awsRegion,
  },
  stackName: buildStackName('secrets-management', serviceAccount.applicationStage, serviceAccount.awsRegion),
  applicationStage: serviceAccount.applicationStage,
  awsRegion: serviceAccount.awsRegion,
  mongoDbUrl,
  jwtSecret,
  description: 'This stack includes AWS Secrets Manager resources for the GraphQL API',
});

app.synth();
