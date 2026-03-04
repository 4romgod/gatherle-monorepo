import type { ApolloError } from '@apollo/client';

/**
 * Common types for server actions
 */

export type ActionState = {
  apiError?: string | null;
  zodErrors?: Record<string, string[]> | null;
  data?: unknown;
  success?: boolean;
};

/**
 * Extract GraphQL errors from an ApolloError, checking both graphQLErrors
 * and errors nested inside a networkError (returned with non-2xx HTTP status).
 */
function extractGraphQLErrors(error: ApolloError) {
  if (error.graphQLErrors?.length > 0) {
    return error.graphQLErrors;
  }
  const networkError = error.networkError as {
    result?: { errors?: { message: string; extensions?: { code?: string } }[] };
  } | null;
  if (networkError?.result?.errors?.length) {
    return networkError.result.errors;
  }
  return [];
}

/**
 * Return the extension error code from the first GraphQL error, if present.
 */
export function getApolloErrorCode(error: ApolloError): string | null {
  const errors = extractGraphQLErrors(error);
  return (errors[0]?.extensions?.code as string) ?? null;
}

/**
 * Helper function to extract error message from ApolloError
 * Checks graphQLErrors first (server-side GraphQL errors), then networkError message
 */
export function getApolloErrorMessage(error: ApolloError): string | null {
  const errors = extractGraphQLErrors(error);
  if (errors.length > 0) {
    return errors[0].message;
  }

  // Fall back to generic error message (avoids leaking raw HTTP status strings)
  return error.message || null;
}
