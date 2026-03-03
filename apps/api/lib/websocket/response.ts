import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export const response = (
  statusCode: number,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): APIGatewayProxyResultV2 => ({
  statusCode,
  body: JSON.stringify(body),
  ...(headers ? { headers } : {}),
});

export const parseBody = <T>(body: string | null | undefined): T | null => {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};
