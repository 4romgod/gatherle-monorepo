import { App } from 'aws-cdk-lib';
import { resolveServiceAccount } from './constants';
import { setupServiceAccount } from './utils';

const app = new App();
const deploymentStage = process.env.STAGE;
const deploymentRegion = process.env.AWS_REGION;

if (!deploymentStage || !deploymentRegion) {
  throw new Error(
    'Missing deployment target configuration. Provide both stage and region via ' +
      '`STAGE` and `AWS_REGION` environment variables. Example: ' +
      '`STAGE=Beta AWS_REGION=eu-west-1 npm run cdk -w @gatherle/cdk -- synth`.',
  );
}

const serviceAccount = resolveServiceAccount(deploymentStage, deploymentRegion);

setupServiceAccount(app, serviceAccount);

app.synth();
