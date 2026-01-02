import {ApolloServerPluginLandingPageLocalDefault} from '@apollo/server/plugin/landingPage/default';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import type {Express, Request, Response} from 'express';
import type {GraphQLError, GraphQLFormattedError} from 'graphql';
import {STAGE} from '@/constants';
import type {ApolloServerPlugin} from '@apollo/server';
import {ApolloServer} from '@apollo/server';
import {createServer} from 'http';
import {APPLICATION_STAGES} from '@ntlango/commons';
import {ApolloServerErrorCode} from '@apollo/server/errors';
import {HttpStatusCode} from '@/constants';
import {ERROR_MESSAGES} from '@/validation';
import createSchema from '@/graphql/schema';

export interface ServerContext {
  token?: string;
  req?: Request;
  res?: Response;
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
  const httpExtension = error.extensions?.http as {status?: number} | undefined;
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

const createGraphQLRequestLoggingPlugin = (): ApolloServerPlugin<ServerContext> => ({
  async requestDidStart({request}) {
    if (!request) {
      return {};
    }
    const query = getQueryStringFromRequest(request.query as GraphQLQueryValue | undefined).trim();
    const variables = request.variables ?? {};
    console.log('GraphQL request received:');
    console.log('  Stage:', STAGE);
    console.log('  Operation:', request.operationName ?? '<unnamed>');
    if (query) {
      console.log('  Query:\n', query);
    }
    console.log('  Variables:', JSON.stringify(variables, null, 2));
    return {};
  },
});

export const createApolloServer = async (expressApp?: Express) => {
  console.log('Creating Apollo Server...');
  const apolloServer = new ApolloServer<ServerContext>({
    schema: createSchema(),
    includeStacktraceInErrorResponses: STAGE !== APPLICATION_STAGES.PROD,
    status400ForVariableCoercionErrors: true,
    formatError: (formattedError: GraphQLFormattedError, error: unknown) => {
      console.warn('GraphQL Error:', {formattedError, error});

      const graphQLError = error as GraphQLError;

      const {exception: _exception, http: _http, ...extensionsWithoutException} = formattedError.extensions ?? {};
      const baseErrorCode =
        typeof extensionsWithoutException.code === 'string' ? extensionsWithoutException.code : ApolloServerErrorCode.INTERNAL_SERVER_ERROR;
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
      ...(expressApp ? [ApolloServerPluginDrainHttpServer({httpServer: createServer(expressApp)})] : []),
      ...(STAGE !== APPLICATION_STAGES.PROD ? [createGraphQLRequestLoggingPlugin()] : []),
    ],
  });

  return apolloServer;
};
