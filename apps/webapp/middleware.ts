// Inspired by https://www.youtube.com/watch?v=1MTyCvS05V4
import { auth } from '@/auth';
import { apiAuthPrefix, authRoutes, DEFAULT_LOGIN_REDIRECT, isPublicDynamicRoute, publicRoutes } from '@/routes';
import { ROUTES } from '@/lib/constants';
import { NextResponse } from 'next/server';
import { isAuthenticated, logger } from './lib/utils';

export default auth(async req => {
  const { nextUrl } = req;

  // Check if there's a valid auth session with a valid token
  const token = req.auth?.user?.token;
  const isLoggedIn = Boolean(req.auth?.user) && Boolean(token) && (await isAuthenticated(token));

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname) || isPublicDynamicRoute(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // 1. Allow all API auth routes
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
    logger.warn('[Middleware] Redirecting to login - token invalid or expired');
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // https://clerk.com/docs/references/nextjs/auth-middleware#usage
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
