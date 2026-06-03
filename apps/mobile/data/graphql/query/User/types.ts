import type {
  GetAccountProfileByIdQuery,
  GetUserByIdQuery,
  GetUserProfileByIdQuery,
  GetUsersQuery,
} from '../../types/graphql';

export type MobilePreviewUser = NonNullable<GetUserByIdQuery['readUserById']>;
export type MobileAccountProfile = NonNullable<GetAccountProfileByIdQuery['readUserById']>;
export type MobileDirectoryUser = GetUsersQuery['readUsers'][number];
export type MobilePublicUserProfile = NonNullable<GetUserByIdQuery['readUserById']>;
export type MobilePublicUserProfileResult = GetUserProfileByIdQuery;
