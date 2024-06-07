import dotenv from 'dotenv';

dotenv.config();

export const GRAPHQL_URL = 'http://localhost:9000/v1/graphql'; // TODO move to environment variables
export const JWT_SECRET = 'secret';
