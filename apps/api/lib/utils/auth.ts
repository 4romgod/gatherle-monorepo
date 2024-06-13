import {ServerContext} from '@/server';
import {ArgsDictionary, AuthChecker} from 'type-graphql';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {JWT_SECRET, OPERATION_NAMES} from '@/constants';
import {UserRole, UserType} from '@/graphql/types';
import {verify, sign, JwtPayload} from 'jsonwebtoken';
import {EventDAO} from '@/mongodb/dao';

export const authChecker: AuthChecker<ServerContext> = async ({context, args, info}, roles) => {
    const token = context.token;

    if (token) {
        const user = verifyToken(token);
        const userRole = user.userRole;
        const operationName = info.fieldName;

        // Check if the user has the required role
        if (!roles.includes(userRole)) {
            console.log(`${userRole} type user: '${user.username}' was denied for operation ${operationName} and resource:`);
            console.log(args);
            throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
        }

        if (userRole === UserRole.Admin) {
            console.log(`${userRole} type user: '${user.username}' has permission for operation ${operationName} and resource`);
            console.log(args);
            return true;
        }

        const isAuthorized = await isAuthorizedByOperation(info.fieldName, args, user);
        if (isAuthorized) {
            console.log(`${userRole} type user: '${user.username}' has 'isAuthorizedByOperation' permission for operation ${operationName}`);
            return true;
        }

        throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
};

/**
 * @param user The user to encode into a JWT token
 * @param secret The secret string for JWT encoding
 * @param expiresIn expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms.js).  Eg: 60, "2 days", "10h", "7d"
 * @returns A JWT token as a string
 */
export const generateToken = (user: UserType, secret?: string, expiresIn?: string | number) => {
    return sign(user, secret ?? JWT_SECRET, {expiresIn: expiresIn ?? '1h'});
};

/**
 * @param token A JWT token as a string
 * @param secret The secret string for JWT encoding
 * @returns The user decoded from the JWT token
 */
export const verifyToken = (token: string, secret?: string) => {
    try {
        const {iat, exp, ...user} = verify(token, secret ?? JWT_SECRET) as JwtPayload;
        return user as UserType;
    } catch (err) {
        throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
    }
};

export const isAuthorizedByOperation = async (operationName: string, args: ArgsDictionary, user: UserType) => {
    switch (operationName) {
        case OPERATION_NAMES.UPDATE_USER:
            return args.input.id == user.id;
        case OPERATION_NAMES.DELETE_USER_BY_ID:
            return args.id == user.id;
        case OPERATION_NAMES.UPDATE_EVENT:
        case OPERATION_NAMES.DELETE_EVENT:
            return await isAuthorizedToUpdateEvent(args.eventId, user);
        case OPERATION_NAMES.CREATE_EVENT:
            return true; // allows all role based users
        default:
            return false;
    }
};

const isAuthorizedToUpdateEvent = async (eventId: string, user: UserType) => {
    const event = await EventDAO.readEventById(eventId);
    return event.organizers.map((organizer) => organizer.id.toString()).includes(user.id);
};
