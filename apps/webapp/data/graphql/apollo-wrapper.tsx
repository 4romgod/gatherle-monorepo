'use client';

import { GRAPHQL_URL } from '@/lib/constants';
import { HttpLink } from '@apollo/client';
import { ApolloNextAppProvider, InMemoryCache, ApolloClient } from '@apollo/client-integration-nextjs';

// Inspired by https://github.com/apollographql/apollo-client-integrations/tree/main/packages/nextjs

const makeClient = () => {
  const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
    fetchOptions: { next: { revalidate: 0 } },
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink,
  });
};

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
