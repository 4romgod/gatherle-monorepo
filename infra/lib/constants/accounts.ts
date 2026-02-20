import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons';

type Stage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];
type Region = (typeof AWS_REGIONS)[keyof typeof AWS_REGIONS];

export type ServiceAccount = {
  targetId: string;
  accountNumber: string;
  awsRegion: string;
  applicationStage: string;
  bootstrapAuthStack: boolean;
};

type RegionalAccountConfig = {
  accountNumber: string;
  bootstrapAuthStack?: boolean;
};

const STAGE_REGION_ACCOUNT_CONFIGS: Partial<Record<Stage, Partial<Record<Region, RegionalAccountConfig>>>> = {
  [APPLICATION_STAGES.BETA]: {
    [AWS_REGIONS.DUB]: {
      accountNumber: '471112776816',
      bootstrapAuthStack: true,
    },
  },
};

const validateBootstrapAuthTargets = (): void => {
  const bootstrapTargetCountByAccount = new Map<string, number>();

  for (const regionsByStage of Object.values(STAGE_REGION_ACCOUNT_CONFIGS)) {
    if (!regionsByStage) {
      continue;
    }

    for (const regionalConfig of Object.values(regionsByStage)) {
      if (!regionalConfig?.bootstrapAuthStack) {
        continue;
      }

      const count = bootstrapTargetCountByAccount.get(regionalConfig.accountNumber) ?? 0;
      bootstrapTargetCountByAccount.set(regionalConfig.accountNumber, count + 1);
    }
  }

  const duplicateBootstrapAccounts = [...bootstrapTargetCountByAccount.entries()]
    .filter(([, count]) => count > 1)
    .map(([accountNumber]) => accountNumber);

  if (duplicateBootstrapAccounts.length > 0) {
    throw new Error(
      `Duplicate bootstrapAuthStack targets found for account(s): ${duplicateBootstrapAccounts.join(', ')}. ` +
        'Only one stage+region target per account may set bootstrapAuthStack=true.',
    );
  }
};

validateBootstrapAuthTargets();

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
    bootstrapAuthStack: accountForRegion.bootstrapAuthStack === true,
  };
};
