import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { APP_ACCESS_BLOCKED_ERROR_CODE } from '@gatherle/commons/client/constants';
import { reportFrontendError } from '@/lib/errors/reportFrontendError';
import { notifyAppAccessBlocked } from '@/lib/appAccessBlock';
import { getMobileGraphqlHeaders } from '@/lib/deviceInstallation';

export const DEFAULT_GRAPHQL_URL = 'https://api.beta.af-south-1.gatherle.com/graphql';
export const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
export const isUsingDefaultGraphqlUrl = !process.env.EXPO_PUBLIC_GRAPHQL_URL?.trim();

type GraphQLErrorLike = {
  extensions?: { code?: string };
  message: string;
};

function extractGraphQLErrors(
  graphQLErrors: readonly GraphQLErrorLike[] | undefined,
  networkError: unknown,
): readonly GraphQLErrorLike[] {
  if (graphQLErrors?.length) {
    return graphQLErrors;
  }

  const resolvedNetworkError = networkError as {
    result?: { errors?: GraphQLErrorLike[] };
  } | null;

  if (resolvedNetworkError?.result?.errors?.length) {
    return resolvedNetworkError.result.errors;
  }

  return [];
}

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  const resolvedErrors = extractGraphQLErrors(graphQLErrors, networkError);

  if (resolvedErrors.length === 0 && !networkError) {
    return;
  }

  const blockedAccessError = resolvedErrors.find((error) => error.extensions?.code === APP_ACCESS_BLOCKED_ERROR_CODE);

  if (blockedAccessError) {
    notifyAppAccessBlocked(blockedAccessError.message);
  }

  reportFrontendError('Apollo operation failed', undefined, {
    graphQLErrors: resolvedErrors,
    networkError,
    operationName: operation.operationName,
  });
});

const mobileHeadersLink = setContext(async (_, previousContext) => {
  const mobileHeaders = await getMobileGraphqlHeaders();

  return {
    headers: {
      ...mobileHeaders,
      ...(previousContext.headers ?? {}),
    },
  };
});

export const apolloClient = new ApolloClient({
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
          notifications: {
            merge: false,
          },
          readChatConversations: {
            merge: false,
          },
          readEventCategories: {
            merge: false,
          },
          readEvents: {
            keyArgs: ['options', ['filters', 'dateFilterOption', 'customDate', 'location', 'sort', 'pagination']],
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
  link: from([
    errorLink,
    mobileHeadersLink,
    new HttpLink({
      uri: GRAPHQL_URL,
    }),
  ]),
});
