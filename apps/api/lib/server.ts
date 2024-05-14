import express, {Express} from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import {MongoDbClient} from './clients';
import {API_PORT, API_DOMAIN, NODE_ENV, STAGES, MONGO_DB_URL} from './constants';
import createSchema from './graphql/schema';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';

interface ServerContext {
    token?: string;
}

const app: Express = express();

const initializeApp = async () => {
    try {
        await MongoDbClient.connectToDatabase(MONGO_DB_URL);

        app.use(morgan('dev'));
        app.use(bodyParser.json({limit: '50mb'}));
        app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

        const server = new ApolloServer<ServerContext>({
            schema: await createSchema(),
            plugins: [
                ApolloServerPluginDrainHttpServer({
                    httpServer: http.createServer(app),
                }),
            ],
        });

        await server.start();

        app.use(
            '/api/v1/graphql',
            cors<cors.CorsRequest>(),
            express.json(),
            expressMiddleware(server, {
                context: async ({req}) => ({token: req.headers.token}),
            }),
        );

        app.listen(API_PORT, () => {
            console.log(`⚡️[server]: Server is running at ${API_DOMAIN}:${API_PORT}`);
            app.emit('appInitialized');
        });
    } catch (error) {
        console.error('Error while starting the server:', error);
    }
};

initializeApp();

export {app};
