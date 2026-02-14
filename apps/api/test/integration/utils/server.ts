import type { Express } from 'express';
import type { Server } from 'http';
import type { ListenOptions } from 'net';
import { startExpressApolloServer } from '@/graphql/apollo';
import type { ServerContext } from '@/graphql/apollo/server';
import type { ApolloServer } from '@apollo/server';
import { MongoDbClient } from '@/clients';
import { getIntegrationTestConfig } from '../config';

export interface IntegrationServer {
  url: string;
  expressApp?: Express;
  apolloServer?: ApolloServer<ServerContext>;
  httpServer?: Server;
  isLocal: boolean;
}

/**
 * Starts integration test server based on STAGE environment variable.
 *
 * - STAGE=Dev: Starts a local Express/Apollo server
 * - STAGE=Beta/Prod: Returns the GRAPHQL_URL without starting a server
 */
export const startIntegrationServer = async (options: ListenOptions): Promise<IntegrationServer> => {
  const config = getIntegrationTestConfig();

  if (!config.useLocalServer) {
    // Beta/Prod stage - use deployed endpoint
    return {
      url: config.testUrl!,
      isLocal: false,
    };
  }

  // Dev stage - start local server
  const localServer = await startExpressApolloServer(options);
  return {
    url: localServer.url,
    expressApp: localServer.expressApp,
    apolloServer: localServer.apolloServer,
    httpServer: localServer.httpServer,
    isLocal: true,
  };
};

/**
 * Stops integration test server if it was started locally.
 * If testing against deployed endpoint, this is a no-op.
 */
export const stopIntegrationServer = async (server: IntegrationServer) => {
  if (!server.isLocal) {
    // Deployed endpoint - nothing to stop
    return;
  }

  // Stop local server
  if (server.apolloServer) {
    await server.apolloServer.stop();
  }
  if (server.httpServer) {
    server.httpServer.close();
  }
  await MongoDbClient.disconnectFromDatabase();
};
