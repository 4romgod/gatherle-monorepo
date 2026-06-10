'use client';

import { APP_ACCESS_BLOCKED_ERROR_CODE } from '@gatherle/commons/client/constants';
import { GRAPHQL_URL } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { notifyAppAccessBlocked } from '@/lib/utils/app-access-block';
import { HttpLink, from } from '@apollo/client';
import { ApolloNextAppProvider, InMemoryCache, ApolloClient } from '@apollo/client-integration-nextjs';
import { onError } from '@apollo/client/link/error';

// Inspired by https://github.com/apollographql/apollo-client-integrations/tree/main/packages/nextjs

const makeClient = () => {
  const extractGraphQLErrors = (
    graphQLErrors:
      | ReadonlyArray<{
          extensions?: { code?: string };
          message?: string;
        }>
      | undefined,
    networkError: unknown,
  ) => {
    if (graphQLErrors?.length) {
      return graphQLErrors;
    }

    const resolvedNetworkError = networkError as {
      result?: {
        errors?: Array<{
          extensions?: { code?: string };
          message?: string;
        }>;
      };
    } | null;

    return resolvedNetworkError?.result?.errors ?? [];
  };

  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    const resolvedErrors = extractGraphQLErrors(graphQLErrors, networkError);

    if (resolvedErrors.length === 0 && !networkError) {
      return;
    }

    const blockedAccountError = resolvedErrors.find(
      (error) => error.extensions?.code === APP_ACCESS_BLOCKED_ERROR_CODE,
    );
    if (blockedAccountError) {
      notifyAppAccessBlocked(blockedAccountError.message);
    }

    logger.error('Apollo operation failed', {
      graphQLErrors: resolvedErrors,
      networkError,
      operationName: operation.operationName,
    });
  });
  const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
    fetchOptions: { next: { revalidate: 0 } },
  });

  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        User: {
          keyFields: ['userId'],
        },
        EventSeries: {
          keyFields: ['eventId'],
        },
        EventOccurrence: {
          keyFields: ['occurrenceId'],
        },
        Follow: {
          keyFields: ['followId'],
        },
        EventMoment: {
          keyFields: ['momentId'],
        },
        Query: {
          fields: {
            readEvents: {
              keyArgs: ['options', ['filters', 'dateFilterOption', 'customDate', 'location', 'sort', 'pagination']],
              merge: false,
            },
          },
        },
      },
    }),
    devtools: {
      enabled: process.env.NODE_ENV !== 'production',
    },
    link: from([errorLink, httpLink]),
  });
};

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
