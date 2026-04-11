import type { DefaultSession } from 'next-auth';
import type { UserWithToken } from '@/data/graphql/types/graphql';

export type ExtendedUser = DefaultSession['user'] & UserWithToken;

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser;
  }

  interface User extends ExtendedUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends ExtendedUser {}
}
