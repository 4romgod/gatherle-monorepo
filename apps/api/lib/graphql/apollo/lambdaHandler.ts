import type {APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context} from 'aws-lambda';
import {startServerAndCreateLambdaHandler, handlers} from '@as-integrations/aws-lambda';
import {createApolloServer} from '@/graphql';
import {getConfigValue, MongoDbClient} from '@/clients';
import {SECRET_KEYS} from '@/constants';
import {logger} from '@/utils/logger';
import {createUserLoader, createEventCategoryLoader, createOrganizationLoader} from '@/graphql/loaders';

// TODO Consider restricting the allowed origins to specific domains or implementing dynamic origin validation based on environment configuration.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, token',
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
    cachedLambdaHandler = startServerAndCreateLambdaHandler(cachedServer, handlers.createAPIGatewayProxyEventRequestHandler(), {
      context: async ({event, context}) => {
        const token = event.headers.token;
        return {
          token: Array.isArray(token) ? token[0] : token,
          lambdaEvent: event,
          lambdaContext: context,
          loaders: {
            user: createUserLoader(),
            eventCategory: createEventCategoryLoader(),
            organization: createOrganizationLoader(),
          },
        };
      },
    });
    logger.info('Lambda handler created');
  }

  return cachedLambdaHandler;
}

export const graphqlLambdaHandler = async (event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) => {
  try {
    logger.info('Lambda handler invoked');
    logger.debug(`Request ID: ${context.awsRequestId}`);
    logger.debug(`Path: ${event.path}`);
    logger.debug(`HTTP Method: ${event.httpMethod}`);
    logger.debug(`Body: ${event.body ? event.body.substring(0, 200) : 'no body'}`);
    
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
    logger.info(`Lambda handler execution completed in ${duration}ms`);
    logger.debug(`Result status: ${result?.statusCode}`);
    logger.debug(`Result body length: ${result?.body?.length || 0}`);
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
    logger.error('Error in lambda handler:', error);
    logger.error(`Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    };
  }
};
