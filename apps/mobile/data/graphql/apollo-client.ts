import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const DEFAULT_GRAPHQL_URL = 'https://api.beta.af-south-1.gatherle.com/graphql';
export const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
export const isUsingDefaultGraphqlUrl = !process.env.EXPO_PUBLIC_GRAPHQL_URL?.trim();

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      EventMoment: {
        keyFields: ['momentId'],
      },
      Query: {
        fields: {
          notifications: {
            merge: false,
          },
          readChatConversations: {
            merge: false,
          },
          readEventCategories: {
            merge: false,
          },
          readEventOccurrences: {
            merge: false,
          },
          readOrganizations: {
            merge: false,
          },
          readPendingFollowRequests: {
            merge: false,
          },
        },
      },
    },
  }),
  link: new HttpLink({
    uri: GRAPHQL_URL,
  }),
});
