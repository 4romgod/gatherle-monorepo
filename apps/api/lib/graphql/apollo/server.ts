import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type { Express, Request, Response } from 'express';
import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import { STAGE } from '@/constants';
import { logger } from '@/utils/logger';
import type { ApolloServerPlugin } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { createServer } from 'http';
import { APPLICATION_STAGES } from '@gatherle/commons';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { HttpStatusCode } from '@/constants';
import { ERROR_MESSAGES } from '@/validation';
import createSchema from '@/graphql/schema';
import type DataLoader from 'dataloader';
import type { User, EventCategory, Organization, Event, EventParticipant } from '@gatherle/commons/types';
import type { AuthClaims } from '@/utils/auth';

export interface ServerContext {
  token?: string;
  user?: AuthClaims;
  req?: Request;
  res?: Response;
  loaders: {
    user: DataLoader<string, User | null>;
    eventCategory: DataLoader<string, EventCategory | null>;
    eventCategoryInterestCount: DataLoader<string, number>;
    event: DataLoader<string, Event | null>;
    organization: DataLoader<string, Organization | null>;
    eventParticipant: DataLoader<string, EventParticipant | null>;
    eventParticipantsByEvent: DataLoader<string, EventParticipant[]>;
  };
}

const GRAPHQL_CLIENT_ERROR_CODES = new Set<string>([
  ApolloServerErrorCode.GRAPHQL_PARSE_FAILED,
  ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
  ApolloServerErrorCode.OPERATION_RESOLUTION_FAILURE,
  ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND,
  ApolloServerErrorCode.PERSISTED_QUERY_NOT_SUPPORTED,
]);

const ERROR_CODE_HTTP_STATUS_MAP: Record<string, HttpStatusCode> = {
  [ApolloServerErrorCode.BAD_REQUEST]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.BAD_USER_INPUT]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.GRAPHQL_PARSE_FAILED]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.OPERATION_RESOLUTION_FAILURE]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.PERSISTED_QUERY_NOT_SUPPORTED]: HttpStatusCode.BAD_REQUEST,
  [ApolloServerErrorCode.INTERNAL_SERVER_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  NOT_FOUND: HttpStatusCode.NOT_FOUND,
  CONFLICT: HttpStatusCode.CONFLICT,
  UNAUTHENTICATED: HttpStatusCode.UNAUTHENTICATED,
  UNAUTHORIZED: HttpStatusCode.UNAUTHORIZED,
};

const getHttpStatusFromError = (errorCode: string, error: GraphQLError) => {
  const httpExtension = error.extensions?.http as { status?: number } | undefined;
  const explicitStatus = httpExtension?.status;
  if (typeof explicitStatus === 'number') {
    return explicitStatus;
  }
  return ERROR_CODE_HTTP_STATUS_MAP[errorCode] ?? HttpStatusCode.INTERNAL_SERVER_ERROR;
};

const useInvalidQueryMessage = (code: string) => GRAPHQL_CLIENT_ERROR_CODES.has(code);

type GraphQLQueryValue =
  | string
  | {
      loc?: {
        source?: {
          body?: string;
        };
      };
    };

const getQueryStringFromRequest = (query: GraphQLQueryValue | undefined) => {
  if (!query) {
    return '<query not provided>';
  }
  if (typeof query === 'string') {
    return query;
  }
  return query.loc?.source?.body ?? '<query not provided>';
};

const inferOperationNameFromQuery = (query: string): string | undefined => {
  const match = query.match(/\b(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match?.[1];
};

const isIntrospectionOperation = (operationName?: string, query?: string) =>
  operationName === 'IntrospectionQuery' ||
  operationName?.startsWith('__schema') ||
  (query?.includes('__schema') ?? false);

const createGraphQLRequestLoggingPlugin = (): ApolloServerPlugin<ServerContext> => ({
  async requestDidStart({ request }) {
    if (!request) {
      return {};
    }

    const startQuery = getQueryStringFromRequest(request.query as GraphQLQueryValue | undefined).trim();
    const startOperationName = request.operationName ?? inferOperationNameFromQuery(startQuery);
    let resolvedOperationLogged = false;
    let earlyErrorLogged = false;

    if (!isIntrospectionOperation(startOperationName, startQuery)) {
      logger.debug('GraphQL request started', {
        stage: 'requestDidStart',
        operation: startOperationName ?? '<unresolved>',
      });
    }

    return {
      async didResolveOperation(requestContext) {
        const query = getQueryStringFromRequest(requestContext.request.query as GraphQLQueryValue | undefined).trim();
        const variables = requestContext.request.variables ?? {};
        const operationName =
          requestContext.operationName ?? requestContext.request.operationName ?? inferOperationNameFromQuery(query);

        // Skip introspection queries to reduce log noise
        if (isIntrospectionOperation(operationName, query)) {
          return;
        }

        logger.graphql(operationName ?? '<unnamed>', query, variables);
        resolvedOperationLogged = true;
      },
      async didEncounterErrors(requestContext) {
        if (resolvedOperationLogged || earlyErrorLogged) {
          return;
        }

        const query = getQueryStringFromRequest(requestContext.request.query as GraphQLQueryValue | undefined).trim();
        const operationName =
          requestContext.operationName ?? requestContext.request.operationName ?? inferOperationNameFromQuery(query);

        if (isIntrospectionOperation(operationName, query)) {
          return;
        }

        // Parse/validation/operation resolution errors occur before didResolveOperation.
        if (requestContext.operation) {
          return;
        }

        const variables = requestContext.request.variables ?? {};
        const errorCodes = requestContext.errors
          .map((error) => {
            const code = error.extensions?.code;
            return typeof code === 'string' ? code : undefined;
          })
          .filter((code): code is string => Boolean(code));

        logger.warn('GraphQL request failed before operation resolution', {
          stage: 'parse_or_validation',
          operation: operationName ?? '<unresolved>',
          query,
          variables,
          errorCodes,
          errorCount: requestContext.errors.length,
        });
        earlyErrorLogged = true;
      },
    };
  },
});

export const createApolloServer = async (expressApp?: Express) => {
  logger.info('Creating Apollo Server...');
  const apolloServer = new ApolloServer<ServerContext>({
    schema: createSchema(),
    includeStacktraceInErrorResponses: STAGE !== APPLICATION_STAGES.PROD,
    status400ForVariableCoercionErrors: true,
    formatError: (formattedError: GraphQLFormattedError, error: unknown) => {
      logger.warn('GraphQL Error:', { formattedError, error });

      const graphQLError = error as GraphQLError;

      const { exception: _exception, http: _http, ...extensionsWithoutException } = formattedError.extensions ?? {};
      const baseErrorCode =
        typeof extensionsWithoutException.code === 'string'
          ? extensionsWithoutException.code
          : ApolloServerErrorCode.INTERNAL_SERVER_ERROR;
      const resolvedErrorCode = baseErrorCode;
      const message = useInvalidQueryMessage(resolvedErrorCode) ? ERROR_MESSAGES.INVALID_QUERY : formattedError.message;
      const status = getHttpStatusFromError(resolvedErrorCode, graphQLError);

      return {
        ...formattedError,
        message,
        extensions: {
          ...extensionsWithoutException,
          code: resolvedErrorCode,
          http: {
            status,
          },
        },
      };
    },
    plugins: [
      ApolloServerPluginLandingPageLocalDefault(),
      ...(expressApp ? [ApolloServerPluginDrainHttpServer({ httpServer: createServer(expressApp) })] : []),
      ...(STAGE !== APPLICATION_STAGES.PROD ? [createGraphQLRequestLoggingPlugin()] : []),
    ],
  });

  return apolloServer;
};
