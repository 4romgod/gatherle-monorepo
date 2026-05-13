import type { GetAccountProfileQuery, GetUserByUsernameQuery } from '../../types/graphql';

export type MobilePreviewUser = NonNullable<GetUserByUsernameQuery['readUserByUsername']>;
export type MobileAccountProfile = NonNullable<GetAccountProfileQuery['readUserByUsername']>;
