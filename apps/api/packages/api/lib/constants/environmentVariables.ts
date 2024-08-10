import {config} from 'dotenv';
config();

// Environment viriables
export const API_DOMAIN = `${process.env.API_DOMAIN}`;
export const API_PORT = `${process.env.API_PORT}`;
export const AWS_REGION = `${process.env.AWS_REGION}`;
export const NODE_ENV = `${process.env.NODE_ENV}`;

// Local development environment variables
export const MONGO_DB_URL = `${process.env.MONGO_DB_URL}`;
export const JWT_SECRET = `${process.env.JWT_SECRET}`;

// Secrets
export const NTLANGO_SECRET_ARN = `${process.env.NTLANGO_SECRET_ARN}`;
