import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { GraphQLError } from 'graphql';
import { HttpStatusCode } from '@/constants';

export const response = (
  statusCode: number,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): APIGatewayProxyResultV2 => ({
  statusCode,
  body: JSON.stringify(body),
  ...(headers ? { headers } : {}),
});

export const graphQlErrorToResponse = (error: GraphQLError): APIGatewayProxyResultV2 => {
  const httpExtension = error.extensions?.http as { status?: number } | undefined;
  const statusCode =
    typeof httpExtension?.status === 'number' ? httpExtension.status : HttpStatusCode.INTERNAL_SERVER_ERROR;
  const retryAfterSeconds =
    typeof error.extensions?.retryAfterSeconds === 'number' ? error.extensions.retryAfterSeconds : undefined;

  return response(statusCode, {
    message: error.message,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });
};

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
