import {ServerContext} from '@/server';
import {AuthChecker} from 'type-graphql';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/utils/validators';
import {JWT_SECRET} from '@/constants';
import {UserType} from '@/graphql/types';
import jwt from 'jsonwebtoken';

export const authChecker: AuthChecker<ServerContext> = ({context}, roles) => {
    const token = context.token;

    if (token) {
        const user = verifyToken(token);
        const userRole = user.userRole;
        const isAuthorized = roles.includes(userRole);
        if (isAuthorized) {
            return isAuthorized;
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
