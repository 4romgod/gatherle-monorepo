import cors from 'cors';
import morgan from 'morgan';
import {ListenOptions} from 'net';
import express, {Express} from 'express';
import bodyParser from 'body-parser';
import {MongoDbClient} from '@/clients';
import {API_DOMAIN, MONGO_DB_URL, API_PATH, HttpStatusCode} from '@/constants';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import createSchema from '@/graphql/schema';
import {createServer, Server} from 'http';
import {GraphQLFormattedError} from 'graphql';
import {ApolloServerErrorCode} from '@apollo/server/errors';
import {ERROR_MESSAGES} from '@/validation';
import {reject} from 'lodash';

export interface ServerContext {
    token?: string;
}

const serverStartTimeLabel = 'Server started after';

export const createGraphQlServer = async (listenOptions: ListenOptions) => {
    console.time(serverStartTimeLabel);
    console.log('Creating Apollo with Express middleware server...');

    await MongoDbClient.connectToDatabase(MONGO_DB_URL);

    const expressApp: Express = express();
    expressApp.use(morgan('dev'));
    expressApp.use(bodyParser.json({limit: '50mb'}));
    expressApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    const apolloServer = new ApolloServer<ServerContext>({
        schema: await createSchema(),
        plugins: [
            ApolloServerPluginDrainHttpServer({
                httpServer: createServer(expressApp),
            }),
        ],
        includeStacktraceInErrorResponses: true, // TODO turn this off in prod
        status400ForVariableCoercionErrors: true,
        formatError: (formattedError: GraphQLFormattedError, error: any) => {
            if (formattedError.extensions?.code === ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED) {
                console.error('Failed to process request. Returning formatted Error\n', error);
                return {
                    ...formattedError,
                    message: ERROR_MESSAGES.INVALID_QUERY,
                };
            }
            return formattedError;
        },
    });

    console.log('Starting the apollo server...');
    await apolloServer.start();

    console.log('Adding express middleware to apollo server...');
    expressApp.use(
        API_PATH,
        cors<cors.CorsRequest>(),
        express.json(),
        expressMiddleware(apolloServer, {
            context: async ({req}) => {
                return {token: req.headers.token};
            },
        }),
    );

    expressApp.get('/health', (req, res) => {
        res.status(HttpStatusCode.OK).send('Okay!');
    });

    const url = `${API_DOMAIN}:${listenOptions.port}${API_PATH}`;

    const listenForConnections = () => {
        return new Promise<Server>((resolve) => {
            const httpServer = expressApp.listen(listenOptions.port);
            httpServer
                .once('listening', () => {
                    console.log(`⚡️[server]: Server is running at ${url}`);
                    return resolve(httpServer);
                })
                .once('close', () => {
                    console.log(`Server runnin on ${url} is CLOSED!`);
                    resolve;
                })
                .once('error', (error) => {
                    console.log(`Server failed to listen on port: ${listenOptions.port}`, error);
                    reject;
                });
        });
    };

    const httpServer = await listenForConnections();
    console.timeEnd(serverStartTimeLabel);
    return {url, expressApp, apolloServer, httpServer};
};
