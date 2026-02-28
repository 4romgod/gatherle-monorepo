import cors from 'cors';
import { buildAllowedCorsOrigins } from '@gatherle/commons';
import { CORS_ALLOWED_ORIGINS, STAGE } from '@/constants';

export const getAllowedCorsOrigins = (): string[] => {
  return buildAllowedCorsOrigins(STAGE, CORS_ALLOWED_ORIGINS);
};

export const isOriginAllowed = (origin?: string | null): origin is string => {
  if (!origin) {
    return false;
  }

  return getAllowedCorsOrigins().includes(origin);
};

const CORS_METHODS = 'GET, POST, OPTIONS';
const CORS_ALLOWED_HEADERS = 'Content-Type, Authorization';
const CORS_MAX_AGE_SECONDS = '86400';

export const createCorsHeaders = (origin?: string | null) => {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Max-Age': CORS_MAX_AGE_SECONDS,
  };

  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

export const createCorsMiddleware = () =>
  cors<cors.CorsRequest>({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: Number(CORS_MAX_AGE_SECONDS),
  });
