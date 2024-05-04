import express, {Express} from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import {MongoDbClient} from './clients';
import {graphqlHTTP} from 'express-graphql';
import {API_PORT, API_DOMAIN, NODE_ENV, STAGES, MONGO_DB_URL} from './constants';
import createSchema from './graphql/schema';

const app: Express = express();

const initializeApp = async () => {
    try {
        await MongoDbClient.connectToDatabase(MONGO_DB_URL);

        app.use(morgan('dev'));
        app.use(bodyParser.json({limit: '50mb'}));
        app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

        app.use(
            '/api/v1/graphql',
            graphqlHTTP({
                schema: await createSchema(),
                graphiql: NODE_ENV === STAGES.DEV,
            }),
        );

        app.listen(API_PORT, () => {
            console.log(`⚡️[server]: Server is running at ${API_DOMAIN}:${API_PORT}`);
            app.emit('appInitialized');
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};

initializeApp();

export {app};
