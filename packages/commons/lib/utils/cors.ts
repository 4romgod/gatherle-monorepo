import { DEFAULT_STAGE_WEBAPP_ORIGINS } from '../constants/cors';

const normalizeCorsOrigin = (origin: string): string => {
  const trimmedOrigin = origin.trim();

  if (trimmedOrigin === '*') {
    throw new Error('CORS_ALLOWED_ORIGINS must use explicit origins. Wildcard "*" is not allowed.');
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(trimmedOrigin);
  } catch {
    throw new Error(`Invalid CORS origin "${trimmedOrigin}". Expected an absolute http(s) origin.`);
  }

  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
    throw new Error(`Invalid CORS origin "${trimmedOrigin}". Only http and https origins are allowed.`);
  }

  return parsedOrigin.origin;
};

export const getDefaultWebAppCorsOrigins = (stage: string): string[] => {
  return [...(DEFAULT_STAGE_WEBAPP_ORIGINS[stage] ?? [])];
};

export const parseConfiguredCorsOrigins = (configuredOrigins?: string): string[] => {
  return (configuredOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeCorsOrigin);
};

export const buildAllowedCorsOrigins = (stage: string, configuredOrigins?: string): string[] => {
  return Array.from(new Set([...getDefaultWebAppCorsOrigins(stage), ...parseConfiguredCorsOrigins(configuredOrigins)]));
};
