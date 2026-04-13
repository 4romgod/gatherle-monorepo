import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { isAuthenticated, logger } from '@/lib/utils';
import { exchangeOAuthIdentity } from '@/data/actions/global/auth/oauth';

const asOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const deriveNameParts = (profile: Record<string, unknown> | undefined, user: { name?: string | null }) => {
  const givenName = asOptionalString(profile?.given_name);
  const familyName = asOptionalString(profile?.family_name);
  if (givenName || familyName) {
    return { given_name: givenName, family_name: familyName };
  }

  const fullName = asOptionalString(profile?.name) ?? asOptionalString(user.name);
  if (!fullName) {
    return { given_name: undefined, family_name: undefined };
  }

  const [firstName, ...rest] = fullName.split(' ').filter(Boolean);
  return {
    given_name: firstName,
    family_name: rest.length ? rest.join(' ') : undefined,
  };
};

const isOAuthProvider = (provider: string | undefined): provider is 'google' | 'apple' => {
  return provider === 'google' || provider === 'apple';
};

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && isOAuthProvider(account.provider)) {
        const idToken = asOptionalString(account.id_token);
        if (!idToken) {
          logger.error('[Auth] OAuth provider callback did not include an id_token', { provider: account.provider });
          throw new Error(`${account.provider} sign-in did not return an identity token.`);
        }

        const typedProfile = (profile ?? {}) as Record<string, unknown>;
        const nameParts = deriveNameParts(typedProfile, user);
        const loginResponse = await exchangeOAuthIdentity({
          provider: account.provider,
          idToken,
          email: asOptionalString(typedProfile.email) ?? user.email,
          given_name: nameParts.given_name,
          family_name: nameParts.family_name,
          profile_picture: asOptionalString(typedProfile.picture) ?? user.image,
        });

        const { __typename, ...gatherleUser } = loginResponse;
        return { ...gatherleUser };
      }

      if (user) {
        token = { ...user };
        return token;
      }

      const tokenString = token?.token as string | undefined;
      if (tokenString) {
        logger.debug('[Auth] Validating token');
        const isValid = await isAuthenticated(tokenString);
        logger.debug('[Auth] Token valid:', isValid);
        if (!isValid) {
          logger.warn('[Auth] Token validation failed - token expired or invalid');

          // This signals to NextAuth that the session should be terminated
          return null as unknown as typeof token;
        }
      }

      return token;
    },
    async session({ token, session }) {
      // If token is null/empty, the session is invalid - return empty session
      if (!token || Object.keys(token).length === 0) {
        logger.warn('[Auth] Session invalidated - no valid token');
        // Return session with user set to undefined to trigger re-auth
        // NextAuth will treat this as unauthenticated
        session.user = undefined as unknown as typeof session.user;
        return session;
      }

      session.user = { ...token, ...session.user };
      return session;
    },
  },
  session: { strategy: 'jwt' },
  ...authConfig,
});
