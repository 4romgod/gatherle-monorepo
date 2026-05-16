import type { ServerContext } from '@/graphql/apollo/server';

const trimFirstHeaderValue = (value: string | undefined): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
};

export const getRequestIpFromContext = (context: ServerContext): string | undefined => {
  const forwardedHeader =
    context.req?.headers['x-forwarded-for'] ??
    context.lambdaEvent?.headers?.['x-forwarded-for'] ??
    context.lambdaEvent?.headers?.['X-Forwarded-For'];

  const forwardedIp = trimFirstHeaderValue(Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader);
  if (forwardedIp) {
    return forwardedIp;
  }

  return (
    context.req?.ip ??
    context.req?.socket?.remoteAddress ??
    context.lambdaEvent?.requestContext?.identity?.sourceIp ??
    undefined
  );
};
