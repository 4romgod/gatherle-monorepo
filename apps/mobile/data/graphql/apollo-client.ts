import { ApolloClient, InMemoryCache } from '@apollo/client';

export const graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL;

export const apolloClient = new ApolloClient({
  uri: graphqlUrl,
  cache: new InMemoryCache(),
});
