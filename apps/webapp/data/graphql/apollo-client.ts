import { HttpLink, InMemoryCache, ApolloClient } from '@apollo/client';
import { GRAPHQL_URL } from '@/lib/constants';
import { registerApolloClient } from '@apollo/client-integration-nextjs';

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: GRAPHQL_URL,
      fetchOptions: { next: { revalidate: 0 } },
    }),
  });
});
