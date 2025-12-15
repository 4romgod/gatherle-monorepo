import type {Express} from 'express';
import type {Server} from 'http';
import type {ListenOptions} from 'net';
import {startExpressApolloServer} from '@/graphql/apollo';
import {ServerContext} from '@/graphql/apollo/server';
import {ApolloServer} from '@apollo/server';
import {MongoDbClient} from '@/clients';

export interface IntegrationServer {
  url: string;
  expressApp: Express;
  apolloServer: ApolloServer<ServerContext>;
  httpServer: Server;
}

export const startIntegrationServer = async (options: ListenOptions) => {
  return startExpressApolloServer(options);
};

export const stopIntegrationServer = async (server: IntegrationServer) => {
  await server.apolloServer.stop();
  server.httpServer.close();
  await MongoDbClient.disconnectFromDatabase();
};
