// Inspired by https://www.youtube.com/watch?v=1MTyCvS05V4
import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { apiAuthPrefix, authRoutes, DEFAULT_LOGIN_REDIRECT, isPublicDynamicRoute, publicRoutes } from '@/routes';
import { ROUTES } from '@/lib/constants';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;

  const isLoggedIn = Boolean(req.auth);
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname) || isPublicDynamicRoute(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // 1. Allow all API aut routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // 2. Allow all auth routes for unauthenticated users
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  // 3. Deny all NON public routes for unauthenticated users
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // https://clerk.com/docs/references/nextjs/auth-middleware#usage
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
