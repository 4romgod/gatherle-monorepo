import { APPLICATION_STAGES } from './general';

export const DEFAULT_LOCAL_WEBAPP_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;
export const DEFAULT_LOCAL_MOBILE_ORIGINS = ['http://localhost:8081', 'http://127.0.0.1:8081'] as const;
export const DEFAULT_LOCAL_ORIGINS = [...DEFAULT_LOCAL_WEBAPP_ORIGINS, ...DEFAULT_LOCAL_MOBILE_ORIGINS] as const;

export const DEFAULT_STAGE_WEBAPP_ORIGINS: Record<string, readonly string[]> = {
  [APPLICATION_STAGES.DEV]: DEFAULT_LOCAL_ORIGINS,
  [APPLICATION_STAGES.BETA]: [
    ...DEFAULT_LOCAL_ORIGINS,
    'https://beta.gatherle.com',
    'https://www.beta.gatherle.com',
  ],
  [APPLICATION_STAGES.GAMMA]: [
    ...DEFAULT_LOCAL_ORIGINS,
    'https://gamma.gatherle.com',
    'https://www.gamma.gatherle.com',
  ],
  [APPLICATION_STAGES.PROD]: [
    'https://gatherle.com',
    'https://www.gatherle.com',
  ],
};
