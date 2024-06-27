import {API_PORT} from '@/constants';
import {startExpressApolloServer} from '@/server';

startExpressApolloServer({port: Number(API_PORT)}).catch((error) => {
    console.error('An error occurred while attempting to start the server:', error);
});
