import type { ApolloError } from '@apollo/client';

const hasNotFoundCode = (error: any) => error?.extensions?.code === 'NOT_FOUND';

const extractGraphQLErrors = (error: any) => {
  const fromGraphQLErrors = Array.isArray(error?.graphQLErrors) ? error.graphQLErrors : [];
  const fromNetworkErrors = Array.isArray(error?.networkError?.result?.errors) ? error.networkError.result.errors : [];
  return [...fromGraphQLErrors, ...fromNetworkErrors];
};

export const isNotFoundGraphQLError = (error?: ApolloError | null) => {
  const graphQLErrors = extractGraphQLErrors(error);
  const fromGraphQLErrors = graphQLErrors.some(hasNotFoundCode);
  const fromMessage = typeof error?.message === 'string' && error.message.toLowerCase().includes('not found');

  return Boolean(fromGraphQLErrors || fromMessage);
};

export const isGraphQLErrorNotFound = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const graphQLErrors = extractGraphQLErrors(error);
  if (graphQLErrors.some(hasNotFoundCode)) {
    return true;
  }
  if (typeof (error as any).message === 'string') {
    return (error as any).message.toLowerCase().includes('not found');
  }
  return false;
};
