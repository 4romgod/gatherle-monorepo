import dotenv from 'dotenv';

dotenv.config();

export const API_DOMAIN = `${process.env.API_DOMAIN}`;
export const API_PORT = `${process.env.API_PORT}`;
export const MONGO_DB_URL = `${process.env.MONGO_DB_URL}`;
export const NODE_ENV = `${process.env.NODE_ENV}`;
