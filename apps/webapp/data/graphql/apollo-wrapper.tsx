'use client';

import { GRAPHQL_URL } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { HttpLink, from } from '@apollo/client';
import { ApolloNextAppProvider, InMemoryCache, ApolloClient } from '@apollo/client-integration-nextjs';
import { onError } from '@apollo/client/link/error';

// Inspired by https://github.com/apollographql/apollo-client-integrations/tree/main/packages/nextjs

const makeClient = () => {
  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (!graphQLErrors?.length && !networkError) {
      return;
    }

    logger.error('Apollo operation failed', {
      graphQLErrors,
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
