import type { CreateUserInput } from '@gatherle/commons/server/types';

export type SystemUserSeedData = Omit<CreateUserInput, 'password' | 'interests'> & {
  passwordEnvVar: string;
  passwordPromptLabel?: string;
  seedInterests?: boolean;
};
