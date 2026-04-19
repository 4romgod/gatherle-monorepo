export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHENTICATED = 401,
  UNAUTHORIZED = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export enum WebSocketCloseCode {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
  INVALID_FRAME_PAYLOAD = 1007,
  POLICY_VIOLATION = 1008,
  MESSAGE_TOO_BIG = 1009,
  INTERNAL_SERVER_ERROR = 1011,
  SERVICE_RESTART = 1012,
  TRY_AGAIN_LATER = 1013,
  BAD_GATEWAY = 1014,
  // Custom application codes (4000-4999)
  APP_BAD_REQUEST = 4400,
  APP_UNAUTHORIZED = 4401,
  APP_FORBIDDEN = 4403,
  APP_NOT_FOUND = 4404,
}

export const GRAPHQL_API_PATH = '/v1/graphql';

export const REGEX_PHONE_NUMBER = /^\+\d{1,3}\d{3,14}$/;
export const REGEX_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEXT_MONGO_DB_ERROR = /\{ (.*?): (.*?) \}/;

export const SECRET_KEYS = {
  MONGO_DB_URL: 'MONGO_DB_URL',
  JWT_SECRET: 'JWT_SECRET',
};
