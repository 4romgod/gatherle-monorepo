import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons';

type Stage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];
type Region = (typeof AWS_REGIONS)[keyof typeof AWS_REGIONS];

export type ServiceAccount = {
  targetId: string;
  accountNumber: string;
  awsRegion: string;
  applicationStage: string;
};

type RegionalAccountConfig = {
  accountNumber: string;
};

const STAGE_REGION_ACCOUNT_CONFIGS: Partial<Record<Stage, Partial<Record<Region, RegionalAccountConfig>>>> = {
  [APPLICATION_STAGES.BETA]: {
    [AWS_REGIONS.CPT]: {
      accountNumber: '327319899143',
    },
  },
};

const resolveStage = (input: string): Stage => {
  const stageValues = Object.values(APPLICATION_STAGES) as Stage[];
  const stage = stageValues.find((value) => value.toLowerCase() === input.toLowerCase());

  if (!stage) {
    throw new Error(`Unknown deployment stage "${input}". Available stages: ${stageValues.join(', ')}`);
  }

  return stage;
};

const resolveRegion = (input: string): Region => {
  const regionValues = Object.values(AWS_REGIONS) as Region[];
  const region = regionValues.find((value) => value.toLowerCase() === input.toLowerCase());

  if (!region) {
    throw new Error(`Unknown AWS region "${input}". Available regions: ${regionValues.join(', ')}`);
  }

  return region;
};

export const AVAILABLE_DEPLOYMENT_TARGETS = Object.freeze(
  Object.entries(STAGE_REGION_ACCOUNT_CONFIGS).flatMap(([stage, regions]) =>
    Object.keys(regions ?? {}).map((region) => `${stage.toLowerCase()}-${region.toLowerCase()}`),
  ),
);

export const resolveServiceAccount = (stageInput: string, regionInput: string): ServiceAccount => {
  const applicationStage = resolveStage(stageInput);
  const awsRegion = resolveRegion(regionInput);

  const regionsByStage = STAGE_REGION_ACCOUNT_CONFIGS[applicationStage];
  const accountForRegion = regionsByStage?.[awsRegion];

  if (!accountForRegion) {
    const allowedRegions = Object.keys(regionsByStage ?? {});
    throw new Error(
      `No deployment account configured for stage "${applicationStage}" in region "${awsRegion}". ` +
        `Configured regions for "${applicationStage}": ${allowedRegions.length ? allowedRegions.join(', ') : 'none'}. ` +
        `Add the missing mapping to STAGE_REGION_ACCOUNT_CONFIGS in infra/lib/constants/accounts.ts.`,
    );
  }

  const targetId = `${applicationStage.toLowerCase()}-${awsRegion.toLowerCase()}`;

  return {
    targetId,
    accountNumber: accountForRegion.accountNumber,
    awsRegion,
    applicationStage,
  };
};
