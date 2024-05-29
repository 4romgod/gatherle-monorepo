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

export enum STAGES {
    DEV = 'dev',
    BETA = 'beta',
    GAMMA = 'gamma',
    PROD = 'prod',
}

export const API_PATH = '/v1/graphql';

export const REGEX_PHONE_NUMBER = /^\+\d{1,3}\d{3,14}$/;
export const REGEX_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const OPERATION_NAMES = {
    CREATE_USER: 'createUser',
    LOGIN_USER: 'loginUser',
    UPDATE_USER: 'updateUser',
    DELETE_USER_BY_ID: 'deleteUserById',
    READ_USER_BY_ID: 'readUserById',
    READ_USER_BY_USERNAME: 'readUserByUsername',
    READ_USERS: 'readUsers',
    QUERY_USERS: 'queryUsers',
    CREATE_EVENT: 'createEvent',
    UPDATE_EVENT: 'updateEvent',
    DELETE_EVENT: 'deleteEvent',
    READ_EVENT_BY_ID: 'readEventById',
    READ_EVENT_BY_SLUG: 'readEventBySlug',
    READ_EVENTS: 'readEvents',
    CREATE_EVENT_CATEGORY: 'createEventCategory',
    UPDATE_EVENT_CATEGORY: 'updateEventCategory',
    DELETE_EVENT_CATEGORY: 'deleteEventCategory',
    READ_EVENT_CATEGORY_BY_ID: 'readEventCategoryById',
    READ_EVENT_CATEGORY_BY_SLUG: 'readEventCategoryBySlug',
    READ_EVENT_CATEGORIES: 'readEventCategories',
};
