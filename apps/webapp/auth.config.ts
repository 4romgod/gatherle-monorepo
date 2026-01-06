import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { LoginUserInputSchema } from './data/validation';
import { loginUserGlobalAction } from './data/actions/global/auth/login';
import { JWT_SECRET } from '@/lib/constants';
import type { NextAuthConfig } from 'next-auth';

 // TODO NEXT_PUBLIC_JWT_SECRET for client-side auth config exposes the JWT signing key to every user,
 // since NEXT_PUBLIC_* env vars are publicly readable in the shipped JavaScript. Anyone can inspect the bundle,
 // extract this secret, and mint valid JWTs for your API. Replace this with a server-only secret and change the 
 // client auth flow so it never requires direct access to the signing key.
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
