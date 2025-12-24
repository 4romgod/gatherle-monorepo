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

export const GRAPHQL_API_PATH = '/v1/graphql';

export const REGEX_PHONE_NUMBER = /^\+\d{1,3}\d{3,14}$/;
export const REGEX_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEXT_MONGO_DB_ERROR = /\{ (.*?): (.*?) \}/;

export const OPERATION_NAMES = {
  CREATE_USER: 'createUser',
  LOGIN_USER: 'loginUser',
  UPDATE_USER: 'updateUser',
  DELETE_USER_BY_ID: 'deleteUserById',
  DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
  DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
  READ_USER_BY_ID: 'readUserById',
  READ_USER_BY_USERNAME: 'readUserByUsername',
  READ_USERS: 'readUsers',
  QUERY_USERS: 'queryUsers',
  CREATE_EVENT: 'createEvent',
  UPDATE_EVENT: 'updateEvent',
  DELETE_EVENT: 'deleteEventById',
  DELETE_EVENT_BY_SLUG: 'deleteEventBySlug',
  READ_EVENT_BY_ID: 'readEventById',
  READ_EVENT_BY_SLUG: 'readEventBySlug',
  READ_EVENTS: 'readEvents',
  CREATE_EVENT_CATEGORY: 'createEventCategory',
  UPDATE_EVENT_CATEGORY: 'updateEventCategory',
  DELETE_EVENT_CATEGORY: 'deleteEventCategory',
  READ_EVENT_CATEGORY_BY_ID: 'readEventCategoryById',
  READ_EVENT_CATEGORY_BY_SLUG: 'readEventCategoryBySlug',
  READ_EVENT_CATEGORIES: 'readEventCategories',
  UPSERT_EVENT_PARTICIPANT: 'upsertEventParticipant',
  CANCEL_EVENT_PARTICIPANT: 'cancelEventParticipant',
  READ_EVENT_PARTICIPANTS: 'readEventParticipants',
};

export const ANSI_COLOR_CODES = {
  BLACK: '\x1b[30m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
  GREEN: '\x1b[32m',
  MAGENTA: '\x1b[35m',
  RED: '\x1b[31m',
  WHITE: '\x1b[37m',
  YELLOW: '\x1b[33m',
};

export const HTTP_METHOD_COLOR_MAP = {
  DELETE: ANSI_COLOR_CODES.RED,
  GET: ANSI_COLOR_CODES.BLUE,
  HEAD: ANSI_COLOR_CODES.WHITE,
  PATCH: ANSI_COLOR_CODES.CYAN,
  POST: ANSI_COLOR_CODES.GREEN,
  PUT: ANSI_COLOR_CODES.MAGENTA,
};

export const RESOLVE_TIME_COLOR_MAP = [
  {threshold: 250, color: ANSI_COLOR_CODES.GREEN},
  {threshold: 500, color: ANSI_COLOR_CODES.YELLOW},
  {threshold: 1000, color: ANSI_COLOR_CODES.MAGENTA},
  {threshold: Infinity, color: ANSI_COLOR_CODES.RED},
];

export const STATUS_CODE_COLOR_MAP = [
  {range: /^2\d{2}$/, color: ANSI_COLOR_CODES.GREEN},
  {range: /^3\d{2}$/, color: ANSI_COLOR_CODES.CYAN},
  {range: /^4\d{2}$/, color: ANSI_COLOR_CODES.YELLOW},
  {range: /^5\d{2}$/, color: ANSI_COLOR_CODES.RED},
];

export const SECRET_KEYS = {
  MONGO_DB_URL: 'MONGO_DB_URL',
  JWT_SECRET: 'JWT_SECRET',
};
