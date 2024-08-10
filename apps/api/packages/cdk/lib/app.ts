import {App} from 'aws-cdk-lib';
import {BETA_ACCOUNT} from './constants';
import {setupServiceAccount} from './utils';

const app = new App();

setupServiceAccount(app, BETA_ACCOUNT);

app.synth();
