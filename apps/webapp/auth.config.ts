import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { LoginUserInputSchema } from './data/validation';
import { loginUserGlobalAction } from './data/actions/global/auth/login';
import { JWT_SECRET } from '@/lib/constants';
import type { NextAuthConfig } from 'next-auth';

export default {
  trustHost: true,
  secret: JWT_SECRET,
  providers: [
    GitHubProvider,
    GoogleProvider,
    CredentialsProvider({
      async authorize(credentials) {
        const validatedFields = LoginUserInputSchema.safeParse(credentials);
        if (validatedFields.success) {
          const loginInput = validatedFields.data;
          const loginResponse = await loginUserGlobalAction(loginInput);

          if (loginResponse) {
            const { __typename, ...user } = loginResponse;
            return user;
          }
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
