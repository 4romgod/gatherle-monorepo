export const buildTargetSuffix = (stage: string, region: string): string =>
  `${stage.toLowerCase()}-${region.toLowerCase()}`;

export const buildStackName = (stackBaseName: string, stage: string, region: string): string =>
  `gatherle-${stackBaseName}-${buildTargetSuffix(stage, region)}`;

export const buildAccountScopedStackName = (stackBaseName: string, accountNumber: string): string =>
  `gatherle-${stackBaseName}-${accountNumber}`;

export const buildResourceName = (resourceBaseName: string, stage: string, region: string): string =>
  `${resourceBaseName}-${buildTargetSuffix(stage, region)}`;

export const buildBackendSecretName = (stage: string, region: string): string =>
  `gatherle/backend/${buildTargetSuffix(stage, region)}`;
