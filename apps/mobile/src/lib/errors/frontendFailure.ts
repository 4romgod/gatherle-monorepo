type GraphQLErrorLike = {
  extensions?: { code?: string };
  message?: string;
};

type ApolloLikeError = {
  graphQLErrors?: GraphQLErrorLike[];
  message?: string;
  networkError?: {
    message?: string;
    name?: string;
    result?: { errors?: GraphQLErrorLike[] };
    status?: number;
    statusCode?: number;
  } | null;
};

export type FrontendFailureKind = 'backend' | 'offline' | 'session-expired' | 'unexpected';

const BACKEND_ERROR_CODES = new Set(['INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE']);
const SESSION_ERROR_CODES = new Set(['UNAUTHENTICATED', 'UNAUTHORIZED']);
const SESSION_STATUS_CODES = new Set([401, 403]);
const BACKEND_STATUS_CODES = new Set([500, 502, 503, 504]);
const NETWORK_MESSAGE_PATTERN =
  /connection|fetch failed|load failed|network error|network request failed|offline|timed out|timeout/i;

function asApolloLikeError(error: unknown): ApolloLikeError | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return error as ApolloLikeError;
}

function extractGraphQLErrors(error: ApolloLikeError | null): GraphQLErrorLike[] {
  if (!error) {
    return [];
  }

  if (Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) {
    return error.graphQLErrors;
  }

  return error.networkError?.result?.errors ?? [];
}

export function extractFrontendErrorMessage(error: unknown, fallbackMessage: string): string {
  const apolloLikeError = asApolloLikeError(error);
  const graphQLErrors = extractGraphQLErrors(apolloLikeError);

  if (graphQLErrors[0]?.message) {
    return graphQLErrors[0].message;
  }

  if (apolloLikeError?.networkError?.message) {
    return apolloLikeError.networkError.message;
  }

  if (apolloLikeError?.message) {
    return apolloLikeError.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function classifyFrontendFailure(error: unknown): FrontendFailureKind {
  const apolloLikeError = asApolloLikeError(error);
  const graphQLErrors = extractGraphQLErrors(apolloLikeError);
  const graphQLErrorCode = graphQLErrors[0]?.extensions?.code ?? null;
  const networkStatus = apolloLikeError?.networkError?.statusCode ?? apolloLikeError?.networkError?.status ?? null;
  const message = [graphQLErrors[0]?.message, apolloLikeError?.networkError?.message, apolloLikeError?.message]
    .filter(Boolean)
    .join(' ');

  if (graphQLErrorCode && SESSION_ERROR_CODES.has(graphQLErrorCode)) {
    return 'session-expired';
  }

  if (SESSION_STATUS_CODES.has(networkStatus ?? 0)) {
    return 'session-expired';
  }

  if ((graphQLErrorCode && BACKEND_ERROR_CODES.has(graphQLErrorCode)) || BACKEND_STATUS_CODES.has(networkStatus ?? 0)) {
    return 'backend';
  }

  if (apolloLikeError?.networkError || NETWORK_MESSAGE_PATTERN.test(message)) {
    return 'offline';
  }

  return 'unexpected';
}
