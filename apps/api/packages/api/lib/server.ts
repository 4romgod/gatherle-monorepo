import cors from 'cors';
import express, {Express} from 'express';
import bodyParser from 'body-parser';
import {ListenOptions} from 'net';
import {MongoDbClient} from '@/clients';
import {API_DOMAIN, MONGO_DB_URL, GRAPHQL_API_PATH, HttpStatusCode, NODE_ENV, STAGES} from '@/constants';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import {createServer, Server} from 'http';
import {GraphQLFormattedError} from 'graphql';
import {startServerAndCreateLambdaHandler, handlers} from '@as-integrations/aws-lambda';
import createSchema from '@/graphql/schema';

export interface ServerContext {
    token?: string;
    req?: express.Request;
    res?: express.Response;
}

const serverStartTimeLabel = 'Server started after';

const createApolloServer = (expressApp?: Express) => {
    const apolloServer = new ApolloServer<ServerContext>({
        schema: createSchema(),
        includeStacktraceInErrorResponses: NODE_ENV === STAGES.PROD,
        status400ForVariableCoercionErrors: true,
        formatError: (formattedError: GraphQLFormattedError, error: any) => {
            return formattedError;
        },
        ...(expressApp && {
            plugins: [
                ApolloServerPluginDrainHttpServer({
                    httpServer: createServer(expressApp),
                }),
            ],
        }),
    });

    return apolloServer;
};

export const graphqlLambdaHandler = async (event: any, context: any, callback: any) => {
    console.log('Creating Apollo Server with Lambda Integration...');

    await MongoDbClient.connectToDatabase(MONGO_DB_URL);

    const apolloServer = createApolloServer();
    const lambdaHandler = startServerAndCreateLambdaHandler(apolloServer, handlers.createAPIGatewayProxyEventV2RequestHandler());
    return lambdaHandler(event, context, callback);
};

export const startExpressApolloServer = async (listenOptions: ListenOptions = {port: 2000}) => {
    console.time(serverStartTimeLabel);
    console.log('Creating Apollo with Express middleware server...');

    await MongoDbClient.connectToDatabase(MONGO_DB_URL);

    const expressApp: Express = express();
    expressApp.use(bodyParser.json({limit: '50mb'}));
    expressApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    const apolloServer = createApolloServer(expressApp);

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

    const url = `${API_DOMAIN}:${listenOptions.port}${GRAPHQL_API_PATH}`;

    const listenForConnections = () => {
        return new Promise<Server>((resolve, reject) => {
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
                    console.log(`Server failed to listen on port: ${listenOptions.port}`);
                    reject(error);
                });
        });
    };

    const httpServer = await listenForConnections();
    console.timeEnd(serverStartTimeLabel);
    return {url, expressApp, apolloServer, httpServer};
};
