import type {
  GetUserByIdQuery,
  GetUserProfileByIdQuery,
  GetUsersQuery,
  GetUserByUsernameQuery,
  GetUserProfileQuery,
} from '../../types/graphql';

export type MobilePreviewUser = NonNullable<GetUserByUsernameQuery['readUserByUsername']>;
export type MobileAccountProfile = NonNullable<GetUserProfileQuery['readUserByUsername']>;
export type MobileDirectoryUser = GetUsersQuery['readUsers'][number];
export type MobilePublicUserProfile = NonNullable<GetUserByIdQuery['readUserById']>;
export type MobilePublicUserProfileResult = GetUserProfileByIdQuery;
