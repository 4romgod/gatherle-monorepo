import {APPLICATION_STAGES, AWS_REGIONS} from '@ntlango/commons';

export type ServiceAccount = {
    accountNumber: string;
    awsRegion: string;
    applicationStage: string;
};

export const BETA: ServiceAccount = {
    accountNumber: '471112776816',
    awsRegion: AWS_REGIONS.Ireland,
    applicationStage: APPLICATION_STAGES.BETA,
};
