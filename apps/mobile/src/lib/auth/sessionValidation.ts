import type { ApolloClient, ApolloError, NormalizedCacheObject } from '@apollo/client';
import { APP_ACCESS_BLOCKED_ERROR_CODE, ERROR_MESSAGES } from '@gatherle/commons/client/constants';
import {
  ValidateStoredSessionDocument,
  type ValidateStoredSessionQuery,
  type ValidateStoredSessionQueryVariables,
} from '@data/graphql/query/User/sessionValidation';
import { getApolloAuthContext } from '../auth';
import { getApolloErrorCode, getApolloErrorMessage } from './apolloErrors';
import type { StoredAuthSession } from '../sessionStorage';

const INVALID_SESSION_ERROR_CODES = new Set(['NOT_FOUND', 'UNAUTHENTICATED', 'UNAUTHORIZED']);

export type SessionValidationResult =
  | { kind: 'valid'; session: StoredAuthSession }
  | { kind: 'blocked'; message: string }
  | { kind: 'invalid' }
  | { kind: 'unverified'; session: StoredAuthSession };

export function isInvalidSessionError(error: unknown): boolean {
  const errorCode = getApolloErrorCode(error as ApolloError);
  return Boolean(errorCode && INVALID_SESSION_ERROR_CODES.has(errorCode));
}

export function isBlockedSessionError(error: unknown): boolean {
  return getApolloErrorCode(error as ApolloError) === APP_ACCESS_BLOCKED_ERROR_CODE;
}

export async function validateStoredSession(
  apolloClient: Pick<ApolloClient<NormalizedCacheObject>, 'query'>,
  storedSession: StoredAuthSession,
): Promise<SessionValidationResult> {
  try {
    const { data } = await apolloClient.query<ValidateStoredSessionQuery, ValidateStoredSessionQueryVariables>({
      query: ValidateStoredSessionDocument,
      variables: {
        userId: storedSession.userId,
      },
      fetchPolicy: 'no-cache',
      ...getApolloAuthContext(storedSession.token),
    });

    const resolvedUser = data?.readUserById;
    if (!resolvedUser?.userId || !resolvedUser?.email) {
      return { kind: 'invalid' };
    }

    if (resolvedUser.userId !== storedSession.userId) {
      return { kind: 'invalid' };
    }

    return {
      kind: 'valid',
      session: {
        email: resolvedUser.email,
        token: storedSession.token,
        userId: resolvedUser.userId,
        username: resolvedUser.username ?? storedSession.username ?? null,
      },
    };
  } catch (error) {
    if (isBlockedSessionError(error)) {
      return {
        kind: 'blocked',
        message: getApolloErrorMessage(error as ApolloError) ?? ERROR_MESSAGES.APP_ACCESS_BLOCKED,
      };
    }

    if (isInvalidSessionError(error)) {
      return { kind: 'invalid' };
    }

    console.warn('[sessionValidation] Failed to validate stored session. Keeping local session for now.', error);
    return { kind: 'unverified', session: storedSession };
  }
}
