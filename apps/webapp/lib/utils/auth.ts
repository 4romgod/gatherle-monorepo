import { decodeJwt } from 'jose';
import { logger } from './logger';

const isFutureUnixTimestamp = (value: unknown): boolean => {
  return typeof value === 'number' && Number.isFinite(value) && value * 1000 > Date.now();
};

export const isAuthenticated = async (token: string | undefined): Promise<boolean> => {
  if (!token) {
    return false;
  }

  try {
    const payload = decodeJwt(token);
    return isFutureUnixTimestamp(payload.exp);
  } catch (error) {
    logger.error('Error decoding JWT:', error);
    return false;
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
