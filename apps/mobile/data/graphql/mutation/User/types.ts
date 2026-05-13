import type { CreateUserMutation, LoginUserMutation } from '../../types/graphql';

export type AuthenticatedMobileUser = NonNullable<LoginUserMutation['loginUser']>;
export type RegisteredMobileUser = NonNullable<CreateUserMutation['createUser']>;
