import { UserWithToken, User } from '@/data/graphql/types/graphql';
import { DefaultSession } from 'next-auth';

export type ExtendedUser = DefaultSession['user'] & UserWithToken;

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser;
  }

  interface JWT extends ExtendedUser {}
  interface User extends ExtendedUser {}
}
