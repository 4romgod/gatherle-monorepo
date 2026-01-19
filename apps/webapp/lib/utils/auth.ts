import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/constants/environment-variables';

export const isAuthenticated = async (token: string | undefined): Promise<boolean> => {
  if (!token || !JWT_SECRET) {
    return false;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
};

export type DecodedToken = {
  userId?: string;
  email?: string;
  username?: string;
  iat?: number;
  exp?: number;
};

/**
 * Verify and decode a JWT token in one step.
 * Returns the decoded payload if valid, null otherwise.
 * This is the preferred method for extracting claims securely.
 */
export const verifyAndDecodeToken = async (token: string | undefined): Promise<DecodedToken | null> => {
  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as DecodedToken;
  } catch {
    return null;
  }
};

/**
 * Creates an Authorization header object with Bearer token format.
 * Returns an empty object if no token is provided.
 *
 * @param token - The JWT token to include in the header
 * @returns Object with Authorization header or empty object
 *
 * @example
 * // In Apollo Client context
 * context: {
 *   headers: getAuthHeader(token),
 * }
 */
export const getAuthHeader = (token: string | undefined | null): { Authorization: string } | Record<string, never> => {
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
