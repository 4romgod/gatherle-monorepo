import { APPLICATION_STAGES } from './general';

export const DEFAULT_LOCAL_WEBAPP_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;

export const DEFAULT_STAGE_WEBAPP_ORIGINS: Record<string, readonly string[]> = {
  [APPLICATION_STAGES.DEV]: DEFAULT_LOCAL_WEBAPP_ORIGINS,
  [APPLICATION_STAGES.BETA]: ['https://beta.gatherle.com', 'https://www.beta.gatherle.com'],
  [APPLICATION_STAGES.GAMMA]: ['https://gamma.gatherle.com', 'https://www.gamma.gatherle.com'],
  [APPLICATION_STAGES.PROD]: ['https://gatherle.com', 'https://www.gatherle.com'],
};
