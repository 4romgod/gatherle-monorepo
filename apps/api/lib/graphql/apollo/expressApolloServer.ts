import cors from 'cors';
import type {Express} from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import type {ListenOptions} from 'net';
import {getConfigValue, MongoDbClient} from '@/clients';
import {GRAPHQL_API_PATH, HttpStatusCode, SECRET_KEYS} from '@/constants';
import {createApolloServer} from './server';
import {expressMiddleware} from '@apollo/server/express4';
import type {Server} from 'http';

const DEV_URL = `http://localhost:9000${GRAPHQL_API_PATH}`;

const serverStartTimeLabel = 'Server started after';

export const startExpressApolloServer = async (listenOptions: ListenOptions = {port: 9000}) => {
  console.time(serverStartTimeLabel);
  console.log('Creating Apollo with Express middleware server...');

  const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(secret);

  const expressApp: Express = express();
  expressApp.use(bodyParser.json({limit: '50mb'}));
  expressApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

  const apolloServer = await createApolloServer(expressApp);

  console.log('Starting the apollo server...');
  await apolloServer.start();

  console.log('Adding express middleware to apollo server...');
  expressApp.use(
    GRAPHQL_API_PATH,
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({req, res}) => {
        return {
          token: req.headers.token,
          req,
          res,
        };
      },
    }),
  );

  expressApp.get('/health', (req, res) => {
    res.status(HttpStatusCode.OK).send('Okay!');
  });

  const listenForConnections = () => {
    return new Promise<Server>((resolve, reject) => {
      const httpServer = expressApp.listen(listenOptions.port);
      httpServer
        .once('listening', () => {
          console.log(`⚡️[server]: Server is running at ${DEV_URL}`);
          return resolve(httpServer);
        })
        .once('close', () => {
          console.log(`Server runnin on ${DEV_URL} is CLOSED!`);
          resolve(httpServer);
        })
        .once('error', (error) => {
          console.log(`Server failed to listen on port: ${listenOptions.port}`);
          reject(error);
        });
    });
  };

  const httpServer = await listenForConnections();
  console.timeEnd(serverStartTimeLabel);
  return {url: DEV_URL, expressApp, apolloServer, httpServer};
};
