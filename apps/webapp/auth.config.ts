import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { LoginUserInputSchema } from './data/validation';
import { loginUserGlobalAction } from './data/actions/global/auth/login';
import { NEXTAUTH_SECRET } from '@/lib/constants';
import type { NextAuthConfig } from 'next-auth';

export default {
  trustHost: true,
  secret: NEXTAUTH_SECRET,
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
    // Dummy provider for refreshing session with updated user data
    CredentialsProvider({
      id: 'refresh-session',
      name: 'Refresh Session',
      credentials: {
        userData: { type: 'text' },
        token: { type: 'text' },
      },
      async authorize(credentials) {
        // Return the updated user data with the existing token
        if (credentials?.userData && credentials?.token) {
          try {
            const userData = JSON.parse(credentials.userData as string);
            return {
              ...userData,
              token: credentials.token,
            };
          } catch {
            return null;
          }
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
