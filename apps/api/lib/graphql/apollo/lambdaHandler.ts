import type { APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context } from 'aws-lambda';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { createApolloServer } from '@/graphql';
import { getConfigValue, MongoDbClient } from '@/clients';
import { SECRET_KEYS } from '@/constants';
import { logger } from '@/utils/logger';
import {
  createUserLoader,
  createEventCategoryLoader,
  createEventCategoryInterestCountLoader,
  createEventLoader,
  createOrganizationLoader,
  createEventParticipantLoader,
  createEventParticipantsByEventLoader,
} from '@/graphql/loaders';
import { verifyToken } from '@/utils/auth';
import type { User } from '@ntlango/commons';

// TODO Consider restricting the allowed origins to specific domains or implementing dynamic origin validation based on environment configuration.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Module-level variables for connection reuse across Lambda invocations
let cachedServer: Awaited<ReturnType<typeof createApolloServer>> | null = null;
let cachedLambdaHandler: Awaited<ReturnType<typeof startServerAndCreateLambdaHandler>> | null = null;
let isDbConnected = false;

async function initializeResources() {
  // Initialize database connection if not already connected
  if (!isDbConnected) {
    logger.info('Initializing MongoDB connection...');
    const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
    await MongoDbClient.connectToDatabase(secret);
    isDbConnected = true;
    logger.info('MongoDB connection established');
  }

  // Initialize Apollo Server if not already created
  if (!cachedServer) {
    logger.info('Creating Apollo Server...');
    cachedServer = await createApolloServer();
    logger.info('Apollo Server created');
  }

  // Initialize Lambda handler if not already created
  if (!cachedLambdaHandler) {
    logger.info('Creating Lambda handler...');
    cachedLambdaHandler = startServerAndCreateLambdaHandler(
      cachedServer,
      handlers.createAPIGatewayProxyEventRequestHandler(),
      {
        context: async ({ event, context }) => {
          // API Gateway may lowercase headers, so check both
          const authHeader = event.headers.Authorization || event.headers.authorization;
          const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

          // This enables field resolvers like isSavedByMe to access the current user
          let user: User | undefined;
          if (token) {
            try {
              user = await verifyToken(token);
            } catch {
              // Token invalid or expired - user remains undefined
              // This is fine for public endpoints, @Authorized will throw if needed
            }
          }

          return {
            token,
            user,
            lambdaEvent: event,
            lambdaContext: context,
            loaders: {
              user: createUserLoader(),
              eventCategory: createEventCategoryLoader(),
              eventCategoryInterestCount: createEventCategoryInterestCountLoader(),
              event: createEventLoader(),
              organization: createOrganizationLoader(),
              eventParticipant: createEventParticipantLoader(),
              eventParticipantsByEvent: createEventParticipantsByEventLoader(),
            },
          };
        },
      },
    );
    logger.info('Lambda handler created');
  }

  return cachedLambdaHandler;
}

export const graphqlLambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>,
) => {
  // Set request ID for all logs in this invocation
  const requestId = context.awsRequestId;
  logger.setRequestId(requestId);

  try {
    logger.info('Lambda handler invoked', {
      path: event.path,
      httpMethod: event.httpMethod,
    });
    logger.debug('Request details', {
      body: event.body ? event.body.substring(0, 200) : 'no body',
    });

    // Handle CORS preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      logger.info('Handling OPTIONS preflight request');
      return {
        statusCode: 204,
        body: '',
        headers: CORS_HEADERS,
      };
    }

    logger.info('Initializing resources (reusing cached if available)...');
    const lambdaHandler = await initializeResources();

    logger.info('Executing lambda handler...');
    const startTime = Date.now();
    const result = await lambdaHandler(event, context, callback);
    const duration = Date.now() - startTime;
    logger.info('Lambda handler execution completed', { durationMs: duration });
    logger.debug('Response details', {
      statusCode: result?.statusCode,
      bodyLength: result?.body?.length || 0,
    });
    logger.info('Returning result to API Gateway...');

    // Handle case where result might be void
    if (!result) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from handler' }),
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      };
    }

    // Add CORS headers to the response
    return {
      ...result,
      headers: {
        ...(result.headers || {}),
        ...CORS_HEADERS,
      },
    };
  } catch (error) {
    logger.error('Error in lambda handler', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    };
  } finally {
    // Clear request ID after handling the request
    logger.clearRequestId();
  }
};
