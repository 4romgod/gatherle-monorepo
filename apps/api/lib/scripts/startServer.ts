import 'reflect-metadata';
import { startExpressApolloServer } from '@/graphql';
import { logger } from '@/utils/logger';
import { validateEnv } from '@/constants';
import { startLocalWebSocketServer } from '@/websocket/localServer';

validateEnv();

const start = async () => {
  const server = await startExpressApolloServer();
  startLocalWebSocketServer(server.httpServer);
};

start().catch((error) => {
  logger.error('An error occurred while attempting to start the server:', error);
});
