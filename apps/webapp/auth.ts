import NextAuth from 'next-auth';
import authConfig from '@/auth.config';

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token = { ...user };
      }
      return token;
    },
    async session({ token, session }) {
      session.user = { ...token, ...session.user };
      return session;
    },
  },
  session: { strategy: 'jwt' },
  ...authConfig,
});
