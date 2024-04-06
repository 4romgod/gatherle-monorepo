export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHENTICATED = 401,
    UNAUTHORIZED = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER = 500,
}

export enum STAGES {
    DEV = 'dev',
    BETA = 'beta',
    GAMMA = 'gamma',
    PROD = 'prod',
}
