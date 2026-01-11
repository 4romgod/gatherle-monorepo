import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { isAuthenticated } from '@/lib/utils';

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token = { ...user };
        return token;
      }

      const tokenString = token?.token as string | undefined;
      if (tokenString) {
        const isValid = await isAuthenticated(tokenString);
        if (!isValid) {
          return {};
        }
      }

      return token;
    },
    async session({ token, session }) {
      if (!token || Object.keys(token).length === 0) {
        return session;
      }

      session.user = { ...token, ...session.user };
      return session;
    },
  },
  session: { strategy: 'jwt' },
  ...authConfig,
});
