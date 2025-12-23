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
 * Helper function to extract error message from ApolloError
 * Checks graphQLErrors first (server-side GraphQL errors), then networkError message
 */
export function getApolloErrorMessage(error: ApolloError): string | null {
  // Check GraphQL errors first (most common case)
  if (error.graphQLErrors?.length > 0) {
    return error.graphQLErrors[0].message;
  }
  
  // Fall back to network error message
  if (error.networkError) {
    return error.networkError.message;
  }
  
  // Fall back to generic error message
  return error.message || null;
}
