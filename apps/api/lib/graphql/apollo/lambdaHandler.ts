import type {APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context} from 'aws-lambda';
import {startServerAndCreateLambdaHandler, handlers} from '@as-integrations/aws-lambda';
import {createApolloServer} from '@/graphql';
import {getConfigValue, MongoDbClient} from '@/clients';
import {SECRET_KEYS} from '@/constants';
import { logger } from '@/utils/logger';

export const graphqlLambdaHandler = async (event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) => {
  logger.info('Lambda handler invoked');
  logger.debug(`Request ID: ${context.awsRequestId}`);
  logger.debug(`Path: ${event.path}`);
  logger.info('Creating Apollo Server with Lambda Integration...');

  const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(secret);

  const apolloServer = await createApolloServer();

  logger.info('Starting server and creating lambda handler...');
  const lambdaHandler = startServerAndCreateLambdaHandler(apolloServer, handlers.createAPIGatewayProxyEventRequestHandler(), {
    context: async ({event, context}) => {
      return {
        token: event.headers.token,
        lambdaEvent: event,
        lambdaContext: context,
      };
    },
  });

  return lambdaHandler(event, context, callback);
};
