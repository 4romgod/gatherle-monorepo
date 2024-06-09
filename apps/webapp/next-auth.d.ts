import { UserWithTokenType, UserType } from '@/data/graphql/types/graphql';
import { DefaultSession } from 'next-auth';

export type ExtendedUserType = DefaultSession['user'] & UserType;

declare module 'next-auth' {
  interface Session {
    user: ExtendedUserType;
  }

  interface JWT extends ExtendedUserType {}
  interface User extends ExtendedUserType {}
}
