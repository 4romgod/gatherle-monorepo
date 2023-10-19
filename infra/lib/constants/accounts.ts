import {APP_NAME} from './constants';
import {ServiceAccount, Stage} from './interfaces';

export const ALPHA_DUB: ServiceAccount = {
    name: `${APP_NAME} API Alpha Dub`,
    awsAccountId: '045383269136',
    awsRegion: 'eu-west-1',
    stage: Stage.ALPHA,
};

export const SERVICE_ACCOUNTS: ServiceAccount[] = [ALPHA_DUB];
