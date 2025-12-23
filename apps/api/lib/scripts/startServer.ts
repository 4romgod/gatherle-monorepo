import 'reflect-metadata';
import {startExpressApolloServer} from '@/graphql';

startExpressApolloServer().catch((error) => {
  console.error('An error occurred while attempting to start the server:', error);
});
