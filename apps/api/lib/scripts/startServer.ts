import 'reflect-metadata';
import { startExpressApolloServer } from '@/graphql';
import { logger } from '@/utils/logger';
import { validateEnv } from '@/constants';

// Validate environment configuration before starting server
validateEnv();

startExpressApolloServer().catch((error) => {
  logger.error('An error occurred while attempting to start the server:', error);
});
