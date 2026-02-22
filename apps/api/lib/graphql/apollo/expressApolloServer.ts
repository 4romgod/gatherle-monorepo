import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import type { ListenOptions } from 'net';
import { getConfigValue, MongoDbClient } from '@/clients';
import { GRAPHQL_API_PATH, HttpStatusCode, SECRET_KEYS, validateEnv } from '@/constants';
import { createApolloServer } from './server';
import { expressMiddleware } from '@apollo/server/express4';
import {
  createUserLoader,
  createEventCategoryLoader,
  createEventCategoryInterestCountLoader,
  createEventLoader,
  createOrganizationLoader,
  createEventParticipantLoader,
  createEventParticipantsByEventLoader,
} from '@/graphql/loaders';
import type { Server } from 'http';
import { logger } from '@/utils/logger';
import { verifyToken } from '@/utils/auth';
import type { AuthClaims } from '@/utils/auth';

const DEV_PORT = 9000;

export const startExpressApolloServer = async (listenOptions: ListenOptions = { port: DEV_PORT }) => {
  validateEnv();

  const actualPort = listenOptions.port ?? DEV_PORT;
  const actualUrl = `http://localhost:${actualPort}${GRAPHQL_API_PATH}`;
  const startTime = Date.now();
  logger.info('='.repeat(30));
  logger.info('Starting Apollo Express Server...');
  logger.info(`  Port: ${listenOptions.port}`);
  logger.info(`  GraphQL Path: ${GRAPHQL_API_PATH}`);
  logger.info('='.repeat(30));

  const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(secret);

  const expressApp: Express = express();
  expressApp.use(bodyParser.json({ limit: '50mb' }));
  expressApp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const apolloServer = await createApolloServer(expressApp);

  logger.info('Starting the apollo server...');
  await apolloServer.start();

  logger.info('Adding express middleware to apollo server...');
  expressApp.use(
    GRAPHQL_API_PATH,
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        const authHeader = req.headers.authorization;
        const tokenValue = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        // Try to verify token and populate user for all requests (not just @Authorized ones)
        // This enables field resolvers like isSavedByMe to access the current user
        let user: AuthClaims | undefined;
        if (tokenValue) {
          try {
            user = await verifyToken(tokenValue);
          } catch (error) {
            // Token invalid or expired - user remains undefined
            // This is fine for public endpoints, @Authorized will throw if needed
            logger.debug('Token verification failed', { error });
          }
        }

        return {
          token: tokenValue,
          user,
          req,
          res,
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
    }),
  );

  // Request logging middleware
  expressApp.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMethod = res.statusCode >= 400 ? 'warn' : 'debug';
      logger[logMethod](`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  expressApp.get('/health', (req, res) => {
    logger.debug('Health check requested');
    res.status(HttpStatusCode.OK).send('Okay!');
  });

  const listenForConnections = () => {
    return new Promise<Server>((resolve, reject) => {
      const httpServer = expressApp.listen(listenOptions.port);
      httpServer
        .once('listening', () => {
          logger.info(`⚡️[server]: Server is running at ${actualUrl}`);
          return resolve(httpServer);
        })
        .once('close', () => {
          logger.info(`Server running on ${actualUrl} is CLOSED!`);
          resolve(httpServer);
        })
        .once('error', (error) => {
          logger.error(`Server failed to listen on port: ${listenOptions.port}`, error);
          reject(error);
        });
    });
  };

  const httpServer = await listenForConnections();
  const elapsed = Date.now() - startTime;
  logger.info(`Server started after ${elapsed}ms`);
  return { url: actualUrl, expressApp, apolloServer, httpServer };
};
