import {HttpStatusCode} from '../constants';

/**
 * @desc Return HTTP Exception for given statusCode, errorType and errorMsg
 * @param {string} statusCode - the HTTP status code of the HTTP Exception
 * @param {string} errorType - the error type of the HTTP Exception
 * @param {string} errorMsg - the error message of the HTTP Exception
 * @return {object} Error object
 */
export class NtlangoHttpError extends Error {
    statusCode: number;
    errorType: string;

    constructor(statusCode: number, errorType: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.errorType = errorType;
    }
}

/**
 * @desc Return InvalidArgumentException Exception for given errorMsg
 * @param {string} errorMsg - the error message of the InvalidArgumentException Exception
 * @return {object} Error object
 */
export const InvalidArgumentException = (errorMsg: string): NtlangoHttpError => {
    return new NtlangoHttpError(HttpStatusCode.BAD_REQUEST, 'InvalidArgumentException', errorMsg);
};

/**
 * @desc Return UnauthenticatedException Exception for given errorMsg
 * @param {string} errorMsg - the error message of the UnauthenticatedException Exception
 * @return {object} Error object
 */
export const UnauthenticatedException = (errorMsg: string): NtlangoHttpError => {
    return new NtlangoHttpError(HttpStatusCode.UNAUTHENTICATED, 'UnauthenticatedException', errorMsg);
};

/**
 * @desc Return UnauthorizedException Exception for given errorMsg
 * @param {string} errorMsg - the error message of the UnauthorizedException Exception
 * @return {object} Error object
 */
export const UnauthorizedException = (errorMsg: string): NtlangoHttpError => {
    return new NtlangoHttpError(HttpStatusCode.UNAUTHORIZED, 'UnauthorizedException', errorMsg);
};

/**
 * @desc ResourceNotFoundException 404 when the resource is not found
 * @param {string} errorMsg - the error message of the ResourceNotFoundException Exception
 * @return {object} Error object
 */
export const ResourceNotFoundException = (errorMsg: string): NtlangoHttpError => {
    return new NtlangoHttpError(HttpStatusCode.NOT_FOUND, 'ResourceNotFoundException', errorMsg);
};

/**
 * @desc Return InternalServiceErrorException Exception for given errorMsg
 * @param {string} errorMsg - the error message of the InternalServiceErrorException Exception
 * @return {object} Error object
 */
export const InternalServiceErrorException = (errorMsg: string): NtlangoHttpError => {
    return new NtlangoHttpError(HttpStatusCode.INTERNAL_SERVER, 'InternalServiceErrorException', errorMsg);
};
