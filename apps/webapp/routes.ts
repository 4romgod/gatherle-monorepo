import { ROUTES } from './lib/constants';

/**
 * An array of routes that are accessible to the public
 * These routes DO NOT require authentication
 * @type {string[]}
 */
export const publicRoutes: string[] = [ROUTES.ROOT, ROUTES.EVENTS.ROOT, ROUTES.USERS.ROOT];

/**
 * An array of routes that are used for authentication
 * These routes will redirect authenticated users to '/account/profile'
 * @type {string[]}
 */
export const authRoutes: string[] = [
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.REGISTER,
  ROUTES.AUTH.RESET_PASSWORD,
];

/**
 * An prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication purposes
 * @type {string}
 */
export const apiAuthPrefix: string = ROUTES.API_AUTH_PREFIX;

/**
 * The default redirect path after authenticating
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT: string = ROUTES.ACCOUNT.PROFILE;

/**
 * Helper function to determine if a route is a dynamic route
 * @param {string} pathname - The pathname to check
 * @returns {boolean} - True if the route matches the dynamic pattern, false otherwise
 */
export const isPublicDynamicRoute = (pathname: string): Boolean => {
  const startsWithDynamicBase = pathname.startsWith(ROUTES.EVENTS.ROOT) || pathname.startsWith(ROUTES.USERS.ROOT);
  return startsWithDynamicBase && pathname.split('/').length === 3;
};
