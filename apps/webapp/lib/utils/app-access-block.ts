import { APP_ACCESS_BLOCKED_ERROR_CODE, ERROR_MESSAGES } from '@gatherle/commons/client/constants';

type GraphQLErrorLike = {
  extensions?: { code?: string };
  message?: string;
};

type ApolloLikeError = {
  graphQLErrors?: GraphQLErrorLike[];
  networkError?: {
    result?: { errors?: GraphQLErrorLike[] };
  } | null;
};

type AppAccessBlockedListener = (message: string) => void;

const APP_ACCESS_BLOCKED_STORAGE_KEY = 'gatherle:app-access-blocked-message';
const listeners = new Set<AppAccessBlockedListener>();

function extractGraphQLErrors(error: unknown): GraphQLErrorLike[] {
  if (!error || typeof error !== 'object') {
    return [];
  }

  const apolloLikeError = error as ApolloLikeError;

  if (Array.isArray(apolloLikeError.graphQLErrors) && apolloLikeError.graphQLErrors.length > 0) {
    return apolloLikeError.graphQLErrors;
  }

  return apolloLikeError.networkError?.result?.errors ?? [];
}

function findAppAccessBlockedGraphQLError(graphQLErrors: GraphQLErrorLike[]): GraphQLErrorLike | undefined {
  return graphQLErrors.find((graphQLError) => graphQLError.extensions?.code === APP_ACCESS_BLOCKED_ERROR_CODE);
}

export function getAppAccessBlockedMessage(error?: unknown): string {
  const graphQLErrors = extractGraphQLErrors(error);

  return (
    findAppAccessBlockedGraphQLError(graphQLErrors)?.message?.trim() ||
    graphQLErrors[0]?.message?.trim() ||
    ERROR_MESSAGES.APP_ACCESS_BLOCKED
  );
}

export function isAppAccessBlockedError(error: unknown): boolean {
  return Boolean(findAppAccessBlockedGraphQLError(extractGraphQLErrors(error)));
}

export function storeBlockedAccountMessage(message?: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const resolvedMessage = message?.trim() || ERROR_MESSAGES.APP_ACCESS_BLOCKED;
  window.sessionStorage.setItem(APP_ACCESS_BLOCKED_STORAGE_KEY, resolvedMessage);
}

export function readBlockedAccountMessage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(APP_ACCESS_BLOCKED_STORAGE_KEY);
}

export function clearBlockedAccountMessage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(APP_ACCESS_BLOCKED_STORAGE_KEY);
}

export function notifyAppAccessBlocked(message?: string | null): void {
  const resolvedMessage = message?.trim() || ERROR_MESSAGES.APP_ACCESS_BLOCKED;
  listeners.forEach((listener) => listener(resolvedMessage));
}

export function subscribeToAppAccessBlocked(listener: AppAccessBlockedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
