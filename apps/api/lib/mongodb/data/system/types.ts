import type { CreateUserInput } from '@gatherle/commons/types';

export type SystemUserSeedData = Omit<CreateUserInput, 'password' | 'interests'> & {
  passwordEnvVar: string;
  passwordPromptLabel?: string;
  seedInterests?: boolean;
};
