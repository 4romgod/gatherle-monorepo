import {ServerContext} from '@/graphql';
import {ArgsDictionary, ResolverData} from 'type-graphql';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {OPERATION_NAMES, SECRET_KEYS} from '@/constants';
import {UserRole, UserType} from '@/graphql/types';
import {verify, sign, JwtPayload} from 'jsonwebtoken';
import {EventDAO} from '@/mongodb/dao';
import {getConfigValue} from '@/clients';

/**
 * Authorization checker function for GraphQL resolver operations
 *
 * Note: We removed the AuthChecker type to accommodate unit tests.
 * We can declare the authChecker like:
 *
 * const authChecker: AuthChecker<ServerContext> = ...
 *
 * @param resolverData Resolver data containing context, arguments, and GraphQL resolve info.
 * @param roles Array of roles permitted to access the resolver operation.
 * @returns Returns true if the user is authorized, throws error otherwise.
 */
export const authChecker = async (resolverData: ResolverData<ServerContext>, roles: string[]) => {
  const {context, args, info} = resolverData;
  const token = context.token;

  if (token) {
    const user = await verifyToken(token);
    const userRole = user.userRole;
    const operationName = info.fieldName;

    if (!roles.includes(userRole)) {
      console.log(`${userRole} type user: '${user.username}' was denied for operation ${operationName} and resource:`);
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    if (user.userRole === UserRole.Admin) {
      console.log(`${user.userRole} type user: '${user.username}' has permission for operation ${operationName} and resource`);
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
export const generateToken = async (user: UserType, secret?: string, expiresIn?: string | number) => {
  const jwtSecret = secret || (await getConfigValue(SECRET_KEYS.JWT_SECRET));
  return sign(user, jwtSecret, {expiresIn: expiresIn ?? '1h'});
};

/**
 * @param token A JWT token as a string
 * @param secret The secret string for JWT encoding
 * @returns The user decoded from the JWT token
 */
export const verifyToken = async (token: string, secret?: string) => {
  try {
    const jwtSecret = secret || (await getConfigValue(SECRET_KEYS.JWT_SECRET));
    const {iat, exp, ...user} = verify(token, jwtSecret) as JwtPayload;
    return user as UserType;
  } catch (err) {
    console.log('Error when verifying token', err);
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
};

export const isAuthorizedByOperation = async (operationName: string, args: ArgsDictionary, user: UserType): Promise<boolean> => {
  switch (operationName) {
    case OPERATION_NAMES.UPDATE_USER:
      return args.input.userId == user.userId;
    case OPERATION_NAMES.DELETE_USER_BY_ID:
      return args.userId == user.userId;
    case OPERATION_NAMES.DELETE_USER_BY_EMAIL:
      return args.email == user.email;
    case OPERATION_NAMES.DELETE_USER_BY_USERNAME:
      return args.username == user.username;
    case OPERATION_NAMES.UPDATE_EVENT:
    case OPERATION_NAMES.DELETE_EVENT:
      return await isAuthorizedToUpdateEvent(args.eventId, user);
    case OPERATION_NAMES.CREATE_EVENT:
      return true;
    default:
      return false;
  }
};

const isAuthorizedToUpdateEvent = async (eventId: string, user: UserType) => {
  const event = await EventDAO.readEventById(eventId);
  return event.organizerList.map((organizer) => organizer.userId).includes(user.userId);
};
