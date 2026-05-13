import type { ApolloError } from '@apollo/client';

type GraphQLErrorLike = {
  extensions?: { code?: string };
  message: string;
};

function extractGraphQLErrors(error: ApolloError) {
  if (error.graphQLErrors?.length > 0) {
    return error.graphQLErrors;
  }

  const networkError = error.networkError as {
    result?: { errors?: GraphQLErrorLike[] };
  } | null;

  if (networkError?.result?.errors?.length) {
    return networkError.result.errors;
  }

  return [];
}

export function getApolloErrorCode(error: ApolloError): string | null {
  const errors = extractGraphQLErrors(error);
  return (errors[0]?.extensions?.code as string) ?? null;
}

export function getApolloErrorMessage(error: ApolloError): string | null {
  const errors = extractGraphQLErrors(error);
  if (errors.length > 0) {
    return errors[0].message;
  }

  return error.message || null;
}
