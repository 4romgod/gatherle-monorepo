import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type { Express, Request, Response } from 'express';
import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import { createHash } from 'crypto';
import {
  INVALID_GRAPHQL_REQUEST_OPERATION,
  STAGE,
  UNKNOWN_GRAPHQL_OPERATION_TYPE,
  UNNAMED_GRAPHQL_OPERATION,
} from '@/constants';
import { logger } from '@/utils/logger';
import type { ApolloServerPlugin } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { createServer } from 'http';
import { APPLICATION_STAGES } from '@gatherle/commons';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { HttpStatusCode } from '@/constants';
import { ERROR_MESSAGES } from '@/validation';
import createSchema from '@/graphql/schema';
import {
  assertQuerySelectionMetricsWithinLimits,
  collectQuerySelectionMetrics,
  QUERY_GUARD_ERROR_CODES,
  resolveQueryGuardLimits,
} from '@/graphql/security';
import type DataLoader from 'dataloader';
import type {
  User,
  EventCategory,
  Organization,
  EventSeries,
  EventOccurrence,
  EventOccurrenceParticipant,
} from '@gatherle/commons/types';
import type { AuthClaims } from '@/utils/auth';
import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda';
import { emitGraphqlQueryGuardMetrics } from '@/utils/graphqlQueryGuardMetrics';

export interface ServerContext {
  token?: string;
  user?: AuthClaims;
  req?: Request;
  res?: Response;
  lambdaEvent?: APIGatewayProxyEvent;
  lambdaContext?: LambdaContext;
  loaders: {
    user: DataLoader<string, User | null>;
    eventCategory: DataLoader<string, EventCategory | null>;
    eventCategoryInterestCount: DataLoader<string, number>;
    eventSeries: DataLoader<string, EventSeries | null>;
    eventOccurrence: DataLoader<string, EventOccurrence | null>;
    eventOccurrenceByEventSeries: DataLoader<string, EventOccurrence | null>;
    organization: DataLoader<string, Organization | null>;
    eventOccurrenceParticipant: DataLoader<string, EventOccurrenceParticipant | null>;
    eventOccurrenceParticipantsByOccurrence: DataLoader<string, EventOccurrenceParticipant[]>;
    eventOccurrenceParticipantCountByOccurrence: DataLoader<string, number>;
    myEventOccurrenceParticipant: DataLoader<string, EventOccurrenceParticipant | null>;
    eventSaveCount: DataLoader<string, number>;
    eventSavedByMe: DataLoader<string, boolean>;
  };
}

const queryGuardLimits = resolveQueryGuardLimits(STAGE);

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

const QUERY_GUARD_WARNING_CODES = new Set<string>(Object.values(QUERY_GUARD_ERROR_CODES));

export const shouldWarnForGraphqlClientError = (
  errorCode: string,
  status: number,
  queryGuardCode?: string,
): boolean => {
  if (status === 429 || errorCode === 'TOO_MANY_REQUESTS') {
    return true;
  }

  return Boolean(queryGuardCode && QUERY_GUARD_WARNING_CODES.has(queryGuardCode));
};

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

const getQueryFingerprint = (query: string): string =>
  createHash('sha256')
    .update(query || '<query not provided>')
    .digest('hex')
    .slice(0, 16);

const isIntrospectionOperation = (operationName?: string, query?: string) =>
  operationName === 'IntrospectionQuery' ||
  operationName?.startsWith('__schema') ||
  (query?.includes('__schema') ?? false);

export const createGraphQLRequestLoggingPlugin = (): ApolloServerPlugin<ServerContext> => ({
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
        operation: startOperationName ?? INVALID_GRAPHQL_REQUEST_OPERATION,
      });
    }

    return {
      async didResolveOperation(requestContext) {
        const query = getQueryStringFromRequest(requestContext.request.query as GraphQLQueryValue | undefined).trim();
        const variables = (requestContext.request.variables ?? {}) as Record<string, unknown>;
        const operationName =
          requestContext.operationName ?? requestContext.request.operationName ?? inferOperationNameFromQuery(query);

        // Skip introspection queries to reduce log noise
        if (isIntrospectionOperation(operationName, query)) {
          return;
        }

        logger.graphql({
          operation: operationName ?? UNNAMED_GRAPHQL_OPERATION,
          operationType: requestContext.operation?.operation ?? UNKNOWN_GRAPHQL_OPERATION_TYPE,
          queryFingerprint: getQueryFingerprint(query),
          variableKeys: Object.keys(variables),
        });
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

        const variables = (requestContext.request.variables ?? {}) as Record<string, unknown>;
        const errorCodes = requestContext.errors
          .map((error) => {
            const code = error.extensions?.code;
            return typeof code === 'string' ? code : undefined;
          })
          .filter((code): code is string => Boolean(code));

        logger.debug('GraphQL request failed before operation resolution', {
          stage: 'parse_or_validation',
          operation: operationName ?? INVALID_GRAPHQL_REQUEST_OPERATION,
          queryFingerprint: getQueryFingerprint(query),
          queryLength: query.length,
          variableKeys: Object.keys(variables),
          errorCodes,
          errorCount: requestContext.errors.length,
        });
        earlyErrorLogged = true;
      },
    };
  },
});

export const createGraphqlQueryGuardMetricsPlugin = (): ApolloServerPlugin<ServerContext> => ({
  async requestDidStart() {
    return {
      async didResolveOperation(requestContext) {
        if (!requestContext.document || !requestContext.operation) {
          return;
        }

        const query = getQueryStringFromRequest(requestContext.request.query as GraphQLQueryValue | undefined).trim();
        const operationName =
          requestContext.operationName ?? requestContext.request.operationName ?? inferOperationNameFromQuery(query);

        if (isIntrospectionOperation(operationName, query)) {
          return;
        }

        const variables = (requestContext.request.variables ?? {}) as Record<string, unknown>;
        const selectionMetrics = collectQuerySelectionMetrics(
          requestContext.document,
          requestContext.operation,
          variables,
        );

        try {
          assertQuerySelectionMetricsWithinLimits(selectionMetrics, queryGuardLimits);
          emitGraphqlQueryGuardMetrics({
            operation: operationName,
            operationType: requestContext.operation.operation,
            complexity: selectionMetrics.complexity,
            depth: selectionMetrics.maxDepth,
            accepted: true,
          });
        } catch (error) {
          emitGraphqlQueryGuardMetrics({
            operation: operationName,
            operationType: requestContext.operation.operation,
            complexity: selectionMetrics.complexity,
            depth: selectionMetrics.maxDepth,
            accepted: false,
          });
          throw error;
        }
      },
    };
  },
});

export const createApolloServer = async (expressApp?: Express) => {
  logger.info('Creating Apollo Server...');
  const apolloServer = new ApolloServer<ServerContext>({
    schema: createSchema(),
    includeStacktraceInErrorResponses: STAGE === APPLICATION_STAGES.DEV,
    status400ForVariableCoercionErrors: true,
    formatError: (formattedError: GraphQLFormattedError, error: unknown) => {
      const graphQLError = error as GraphQLError;

      const { exception: _exception, http: _http, ...extensionsWithoutException } = formattedError.extensions ?? {};
      const baseErrorCode =
        typeof extensionsWithoutException.code === 'string'
          ? extensionsWithoutException.code
          : ApolloServerErrorCode.INTERNAL_SERVER_ERROR;
      const resolvedErrorCode = baseErrorCode;
      const queryGuardCode =
        typeof extensionsWithoutException.queryGuardCode === 'string'
          ? extensionsWithoutException.queryGuardCode
          : typeof graphQLError.extensions?.queryGuardCode === 'string'
            ? graphQLError.extensions.queryGuardCode
            : undefined;
      const message = useInvalidQueryMessage(resolvedErrorCode) ? ERROR_MESSAGES.INVALID_QUERY : formattedError.message;
      const status = getHttpStatusFromError(resolvedErrorCode, graphQLError);
      const logContext = {
        code: resolvedErrorCode,
        status,
        message,
        queryGuardCode,
        path: formattedError.path,
        locations: formattedError.locations,
      };

      if (status >= HttpStatusCode.INTERNAL_SERVER_ERROR) {
        logger.error('GraphQL Error:', { ...logContext, error });
      } else if (shouldWarnForGraphqlClientError(resolvedErrorCode, status, queryGuardCode)) {
        logger.warn('GraphQL client error', logContext);
      } else {
        logger.debug('GraphQL client error', logContext);
      }

      return {
        ...formattedError,
        message,
        extensions: {
          ...extensionsWithoutException,
          code: resolvedErrorCode,
          ...(queryGuardCode ? { queryGuardCode } : {}),
          http: {
            status,
          },
        },
      };
    },
    plugins: [
      ...(STAGE !== APPLICATION_STAGES.PROD ? [ApolloServerPluginLandingPageLocalDefault()] : []),
      ...(expressApp ? [ApolloServerPluginDrainHttpServer({ httpServer: createServer(expressApp) })] : []),
      ...(STAGE !== APPLICATION_STAGES.PROD ? [createGraphQLRequestLoggingPlugin()] : []),
      createGraphqlQueryGuardMetricsPlugin(),
    ],
  });

  return apolloServer;
};
