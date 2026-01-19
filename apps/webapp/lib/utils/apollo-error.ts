/**
 * Apollo GraphQL error handling utilities
 */

/**
 * Type definition for Apollo error structure
 * Used for type-safe error extraction from Apollo Client operations
 */
export interface ApolloErrorLike {
  graphQLErrors?: Array<{ message: string; extensions?: { code?: string } }>;
  networkError?: { result?: { errors?: Array<{ message: string }> }; message?: string };
  message?: string;
}

/**
 * Extracts a user-friendly error message from an Apollo error.
 *
 * Checks in order:
 * 1. GraphQL errors (server-side validation/business logic errors)
 * 2. Network errors with embedded error messages
 * 3. General error message
 * 4. Falls back to the provided default message
 *
 * @param error - The caught error (unknown type for safety)
 * @param defaultMessage - Fallback message if no specific error can be extracted
 * @returns A user-friendly error message string
 *
 * @example
 * ```ts
 * try {
 *   await saveMutation();
 * } catch (error) {
 *   const message = extractApolloErrorMessage(error, 'Failed to save. Please try again.');
 *   showToast({ message, severity: 'error' });
 * }
 * ```
 */
export function extractApolloErrorMessage(
  error: unknown,
  defaultMessage = 'An unexpected error occurred. Please try again.',
): string {
  const apolloError = error as ApolloErrorLike;

  // Check for GraphQL errors first (most specific)
  if (apolloError?.graphQLErrors?.[0]?.message) {
    return apolloError.graphQLErrors[0].message;
  }

  // Check for network errors with embedded error messages
  if (apolloError?.networkError?.result?.errors?.[0]?.message) {
    return apolloError.networkError.result.errors[0].message;
  }

  // Check for network error message directly
  if (apolloError?.networkError?.message) {
    return apolloError.networkError.message;
  }

  // Check for general error message
  if (apolloError?.message) {
    return apolloError.message;
  }

  // Return default fallback
  return defaultMessage;
}

/**
 * Checks if an Apollo error is an authentication error.
 *
 * @param error - The caught error
 * @returns true if the error indicates an authentication failure
 */
export function isApolloAuthError(error: unknown): boolean {
  const apolloError = error as ApolloErrorLike;

  return (
    apolloError?.graphQLErrors?.some(
      e => e.extensions?.code === 'UNAUTHENTICATED' || e.message?.includes('logged in'),
    ) ?? false
  );
}
