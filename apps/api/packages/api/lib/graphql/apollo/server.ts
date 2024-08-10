import {ApolloServerPluginLandingPageLocalDefault} from '@apollo/server/plugin/landingPage/default';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import {Express, Request, Response} from 'express';
import {GraphQLFormattedError} from 'graphql';
import {NODE_ENV} from '@/constants';
import {ApolloServer} from '@apollo/server';
import {createServer} from 'http';
import createSchema from '@/graphql/schema';
import {APPLICATION_STAGES} from '@ntlango/commons';

export interface ServerContext {
    token?: string;
    req?: Request;
    res?: Response;
}

export const createApolloServer = async (expressApp?: Express) => {
    const apolloServer = new ApolloServer<ServerContext>({
        schema: createSchema(),
        includeStacktraceInErrorResponses: NODE_ENV === APPLICATION_STAGES.PROD,
        status400ForVariableCoercionErrors: true,
        formatError: (formattedError: GraphQLFormattedError, error: any) => {
            // TODO transform the different error types
            return formattedError;
        },
        plugins: [
            ApolloServerPluginLandingPageLocalDefault(),
            ...(expressApp ? [ApolloServerPluginDrainHttpServer({httpServer: createServer(expressApp)})] : []),
        ],
    });

    return apolloServer;
};
