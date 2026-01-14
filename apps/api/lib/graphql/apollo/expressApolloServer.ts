import cors from 'cors';
import type {Express} from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import type {ListenOptions} from 'net';
import {getConfigValue, MongoDbClient} from '@/clients';
import {GRAPHQL_API_PATH, HttpStatusCode, SECRET_KEYS} from '@/constants';
import {createApolloServer} from './server';
import {expressMiddleware} from '@apollo/server/express4';
import {createUserLoader, createEventCategoryLoader, createOrganizationLoader} from '@/graphql/loaders';
import type {Server} from 'http';
import {logger} from '@/utils/logger';

const DEV_URL = `http://localhost:9000${GRAPHQL_API_PATH}`;

export const startExpressApolloServer = async (listenOptions: ListenOptions = {port: 9000}) => {
  const startTime = Date.now();
  logger.info('='.repeat(30));
  logger.info('Starting Apollo Express Server...');
  logger.info(`  Port: ${listenOptions.port}`);
  logger.info(`  GraphQL Path: ${GRAPHQL_API_PATH}`);
  logger.info('='.repeat(30));

  const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(secret);

  const expressApp: Express = express();
  expressApp.use(bodyParser.json({limit: '50mb'}));
  expressApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

  const apolloServer = await createApolloServer(expressApp);

  logger.info('Starting the apollo server...');
  await apolloServer.start();

  logger.info('Adding express middleware to apollo server...');
  expressApp.use(
    GRAPHQL_API_PATH,
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({req, res}) => {
        const token = req.headers.token;
        return {
          token: Array.isArray(token) ? token[0] : token,
          req,
          res,
          loaders: {
            user: createUserLoader(),
            eventCategory: createEventCategoryLoader(),
            organization: createOrganizationLoader(),
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
          logger.info(`⚡️[server]: Server is running at ${DEV_URL}`);
          return resolve(httpServer);
        })
        .once('close', () => {
          logger.info(`Server running on ${DEV_URL} is CLOSED!`);
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
  return {url: DEV_URL, expressApp, apolloServer, httpServer};
};
