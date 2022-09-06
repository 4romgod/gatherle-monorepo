import {APP_NAME} from './constants/appConstants';
import {ServiceAccount, Stage} from './constants/interfaces';

export const ALPHA_DUB: ServiceAccount = {
    name: `${APP_NAME} Api Alpha Dub`,
    awsAccountId: '045383269136',
    awsRegion: 'eu-west-1',
    stage: Stage.ALPHA,
};
