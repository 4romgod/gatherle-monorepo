import {ServerContext} from '@/server';
import {ArgsDictionary, AuthChecker} from 'type-graphql';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/utils/validators';
import {JWT_SECRET, OPERATION_NAMES} from '@/constants';
import {UserRole, UserType} from '@/graphql/types';
import jwt from 'jsonwebtoken';
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
            console.log(
                `${userRole} type user: '${user.username}' has 'isAuthorizedByOperation' permission for operation ${operationName} and resource:`,
            );
            console.log(args);
            return true;
        }

        throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
};

export const generateToken = (user: UserType) => {
    const token = jwt.sign(user, JWT_SECRET, {expiresIn: '1h'});
    return token;
};

export const verifyToken = (token: string) => {
    try {
        const user = jwt.verify(token, JWT_SECRET) as UserType;
        return user;
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
            return await isAuthorizedToUpdateEvent(args.input.id, user);
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
