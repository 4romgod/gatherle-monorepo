import AppleProvider from 'next-auth/providers/apple';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { LoginUserInputSchema } from './data/validation';
import { loginUserGlobalAction } from './data/actions/global/auth/login';
import { APPLE_OAUTH_CLIENT_ID_WEB, NEXTAUTH_SECRET } from '@/lib/constants';
import type { NextAuthConfig } from 'next-auth';

export default {
  trustHost: true,
  secret: NEXTAUTH_SECRET,
  providers: [
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
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID_WEB,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET_WEB,
      authorization: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        params: {
          prompt: 'select_account',
          scope: 'openid profile email',
        },
      },
      token: 'https://oauth2.googleapis.com/token',
      userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    }),
    AppleProvider({
      clientId: APPLE_OAUTH_CLIENT_ID_WEB,
      clientSecret: process.env.APPLE_OAUTH_CLIENT_SECRET_WEB,
      authorization: {
        params: {
          scope: 'name email',
        },
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
