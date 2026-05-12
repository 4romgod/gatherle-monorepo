import type { GetUserByUsernameQuery } from '../../types/graphql';

export type MobilePreviewUser = NonNullable<GetUserByUsernameQuery['readUserByUsername']>;
