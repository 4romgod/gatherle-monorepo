import { HttpLink, InMemoryCache, ApolloClient } from '@apollo/client';
import { GRAPHQL_URL } from '@/lib/constants';
import { registerApolloClient } from '@apollo/client-integration-nextjs';

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
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
              merge: false, // Replace instead of merge for fresh data
            },
            readEventCategories: {
              merge: false,
            },
            readOrganizations: {
              merge: false,
            },
            readVenues: {
              merge: false,
            },
            readFeed: {
              merge: false,
            },
          },
        },
      },
    }),
    devtools: {
      enabled: process.env.NODE_ENV !== 'production',
    },
    link: new HttpLink({
      uri: GRAPHQL_URL,
      fetchOptions: { next: { revalidate: 0 } },
    }),
  });
});
