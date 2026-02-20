import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons';

export type ServiceAccount = {
  accountNumber: string;
  awsRegion: string;
  applicationStage: string;
};

export const BETA_ACCOUNT: ServiceAccount = {
  accountNumber: '471112776816',
  awsRegion: AWS_REGIONS.Ireland,
  applicationStage: APPLICATION_STAGES.BETA,
};
