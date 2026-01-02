import 'reflect-metadata';
import {startExpressApolloServer} from '@/graphql';
import {logger} from '@/utils/logger';

startExpressApolloServer().catch((error) => {
  logger.error('An error occurred while attempting to start the server:', error);
});
