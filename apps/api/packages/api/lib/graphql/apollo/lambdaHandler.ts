import {APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context} from 'aws-lambda';
import {startServerAndCreateLambdaHandler, handlers} from '@as-integrations/aws-lambda';
import {createApolloServer} from '@/graphql';
import {getSecret, MongoDbClient} from '@/clients';
import {MONGO_DB_URL, NODE_ENV, SECRET_KEYS} from '@/constants';
import {APPLICATION_STAGES} from '@ntlango/commons';

export const graphqlLambdaHandler = async (event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) => {
    console.log('Creating Apollo Server with Lambda Integration...');

    if (NODE_ENV == APPLICATION_STAGES.DEV) {
        await MongoDbClient.connectToDatabase(MONGO_DB_URL);
    } else {
        const secret = await getSecret(SECRET_KEYS.MONGO_DB_URL);
        await MongoDbClient.connectToDatabase(secret);
    }

    const apolloServer = createApolloServer();
    const lambdaHandler = startServerAndCreateLambdaHandler(await apolloServer, handlers.createAPIGatewayProxyEventRequestHandler());

    return lambdaHandler(event, context, callback);
};
