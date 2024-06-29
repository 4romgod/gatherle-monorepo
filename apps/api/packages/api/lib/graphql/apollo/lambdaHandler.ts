import {APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context} from 'aws-lambda';
import {startServerAndCreateLambdaHandler, handlers} from '@as-integrations/aws-lambda';
import {createApolloServer} from '@/graphql';
import {MongoDbClient} from '@/clients';
import {MONGO_DB_URL} from '@/constants';

export const graphqlLambdaHandler = async (event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) => {
    console.log('Creating Apollo Server with Lambda Integration...');

    await MongoDbClient.connectToDatabase(MONGO_DB_URL);

    const apolloServer = createApolloServer();
    const lambdaHandler = startServerAndCreateLambdaHandler(apolloServer, handlers.createAPIGatewayProxyEventRequestHandler());

    return lambdaHandler(event, context, callback);
};
