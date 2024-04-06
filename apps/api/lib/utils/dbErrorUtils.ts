import {InternalServiceErrorException, InvalidArgumentException, NtlangoHttpError} from './exceptions';

/**
 * Get unique error field name
 */
export const uniqueMessage = (error: any) => {
    let output;
    try {
        const fieldName = error.message.substring(error.message.lastIndexOf('.$') + 2, error.message.lastIndexOf('_1'));
        output = fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + ' already exists';
    } catch (ex) {
        output = 'Unique field already exists';
    }

    return output;
};

/**
 * Get the error message from mongodb error object
 */
export const mongodbErrorHandler = (error: any): NtlangoHttpError => {
    let message = 'Something went wrong';

    // TODO Maybe use this in a middleware https://mongoosejs.com/docs/middleware.html
    const {code, keyValue} = error;
    if (code) {
        switch (code) {
            case 11000: {
                const key = Object.keys(keyValue)[0];
                message = `(${key} = ${keyValue[key]}), already exists`;
                return InvalidArgumentException(message);
            }
            case 11001:
                message = uniqueMessage(error);
                return InvalidArgumentException(message);
            case 10334:
                message = 'Your Content is Too Large, Max size is 15MB';
                return InvalidArgumentException(message);
            default:
                message = 'Something went wrong';
                return InternalServiceErrorException(message);
        }
    }

    for (const errorName in error.errorors) {
        if (error.errorors[errorName].message) {
            message = error.errorors[errorName].message;
            break;
        }
    }
    return InternalServiceErrorException(message);
};
