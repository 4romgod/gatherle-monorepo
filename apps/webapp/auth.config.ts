import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { LoginUserInputTypeSchema } from './data/validation';
import { loginUserGlobalAction } from './data/actions/global/auth/login';
import type { NextAuthConfig } from 'next-auth';
import { LoginUserDocument, LoginUserInputType, UserWithTokenType } from '@/data/graphql/types/graphql';

export default {
  providers: [
    GitHubProvider,
    GoogleProvider,
    CredentialsProvider({
      async authorize(credentials) {
        const validatedFields = LoginUserInputTypeSchema.safeParse(credentials);
        if (validatedFields.success) {
          const loginInput = validatedFields.data;
          const loginResponse = await loginUserGlobalAction(loginInput);

          if (loginResponse) {
            const { token, __typename, ...user } = loginResponse;
            return user;
          }
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
