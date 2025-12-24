import type {ServerContext} from '@/graphql';
import type {ArgsDictionary, ResolverData} from 'type-graphql';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {OPERATION_NAMES, SECRET_KEYS} from '@/constants';
import type {User} from '@ntlango/commons/types';
import {UserRole} from '@ntlango/commons/types';
import {verify, sign} from 'jsonwebtoken';
import type {JwtPayload, Secret, SignOptions} from 'jsonwebtoken';
import type {StringValue} from 'ms';
import {EventDAO, EventParticipantDAO} from '@/mongodb/dao';
import {getConfigValue} from '@/clients';
import {Types} from 'mongoose';

const operationsRequiringOwnership = new Set([
  OPERATION_NAMES.UPDATE_USER,
  OPERATION_NAMES.DELETE_USER_BY_ID,
  OPERATION_NAMES.DELETE_USER_BY_EMAIL,
  OPERATION_NAMES.DELETE_USER_BY_USERNAME,
  OPERATION_NAMES.UPDATE_EVENT,
  OPERATION_NAMES.DELETE_EVENT,
  OPERATION_NAMES.DELETE_EVENT_BY_SLUG,
  OPERATION_NAMES.CREATE_EVENT,
  OPERATION_NAMES.UPSERT_EVENT_PARTICIPANT,
  OPERATION_NAMES.CANCEL_EVENT_PARTICIPANT,
  OPERATION_NAMES.READ_EVENT_PARTICIPANTS,
]);

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
      console.log(`${userRole} type user: '${user.username}' was denied for operation ${operationName}`);
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    if (user.userRole === UserRole.Admin) {
      console.log(`${user.userRole} type user: '${user.username}' has permission for operation ${operationName}`);
      return true;
    }

    if (operationsRequiringOwnership.has(operationName)) {
      const isAuthorized = await isAuthorizedByOperation(info.fieldName, args, user);
      if (isAuthorized) {
        console.log(`${userRole} type user: '${user.username}' has 'isAuthorizedByOperation' permission for operation ${operationName}`);
        return true;
      }
      console.log(`${userRole} type user: '${user.username}' was denied for operation ${operationName}`);
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    console.log(`${userRole} type user: '${user.username}' attempted to access non-protected operation ${operationName}`);
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
export const generateToken = async (user: User, secret?: string, expiresIn?: string | number) => {
  const jwtSecret: Secret | undefined = secret ?? (await getConfigValue(SECRET_KEYS.JWT_SECRET));
  if (!jwtSecret) {
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
  const tokenExpiry: StringValue | number = (expiresIn ?? '1h') as StringValue | number;
  const signOptions: SignOptions = {expiresIn: tokenExpiry};
  return sign(user, jwtSecret as Secret, signOptions);
};

/**
 * @param token A JWT token as a string
 * @param secret The secret string for JWT encoding
 * @returns The user decoded from the JWT token
 */
export const verifyToken = async (token: string, secret?: string) => {
  try {
    const jwtSecret: Secret | undefined = secret ?? (await getConfigValue(SECRET_KEYS.JWT_SECRET));
    if (!jwtSecret) {
      throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
    }
    const {iat: _iat, exp: _exp, ...user} = verify(token, jwtSecret) as JwtPayload;
    return user as User;
  } catch (err) {
    console.log('Error when verifying token', err);
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
};

export const isAuthorizedByOperation = async (operationName: string, args: ArgsDictionary, user: User): Promise<boolean> => {
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
      return await isAuthorizedByEventId(args.eventId ?? args.input?.eventId, user);
    case OPERATION_NAMES.DELETE_EVENT_BY_SLUG:
      return await isAuthorizedByEventSlug(args.slug, user);
    case OPERATION_NAMES.CREATE_EVENT:
      return true;
    case OPERATION_NAMES.UPSERT_EVENT_PARTICIPANT:
    case OPERATION_NAMES.CANCEL_EVENT_PARTICIPANT:
      return args.input?.userId === user.userId;
    case OPERATION_NAMES.READ_EVENT_PARTICIPANTS:
      return await isAuthorizedToReadEventParticipants(args.eventId, user);
    default:
      return false;
  }
};

/**
 * Type guard to check if value has a toString method
 */
const hasToString = (value: unknown): value is { toString: () => string } => {
  return typeof value === 'object' && value !== null && typeof (value as any).toString === 'function';
};

/**
 * Type guard to check if value is a record with specific properties
 */
const isOrganizerRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Converts various organizer formats to a user ID string.
 * Handles string IDs, ObjectIds, and organizer objects with userId or _id fields.
 * 
 * @param organizer The organizer value in various possible formats
 * @returns The user ID as a string, or undefined if extraction fails
 */
const toOrganizerUserId = (organizer: unknown): string | undefined => {
  if (!organizer) {
    return undefined;
  }

  if (typeof organizer === 'string') {
    return organizer;
  }

  if (organizer instanceof Types.ObjectId) {
    return organizer.toString();
  }

  if (isOrganizerRecord(organizer)) {
    if (typeof organizer.userId === 'string') {
      return organizer.userId;
    }

    const organizerId = organizer._id;
    if (organizerId && hasToString(organizerId)) {
      return organizerId.toString();
    }

    if (hasToString(organizer)) {
      return organizer.toString();
    }
  }

  return undefined;
};

const getOrganizerIdsFromEvent = (event: {organizerList?: unknown[]}): string[] => {
  if (!event.organizerList) {
    return [];
  }
  return event.organizerList
    .map((organizer) => toOrganizerUserId(organizer))
    .filter((id): id is string => Boolean(id));
};

const isUserOrganizer = (event: {organizerList?: unknown[]}, user: User) => {
  const organizerIds = getOrganizerIdsFromEvent(event);
  return organizerIds.includes(user.userId);
};

const isAuthorizedByEventId = async (eventId: string | undefined, user: User) => {
  if (!eventId) {
    return false;
  }
  const event = await EventDAO.readEventById(eventId);
  return isUserOrganizer(event, user);
};

const isAuthorizedByEventSlug = async (slug: string | undefined, user: User) => {
  if (!slug) {
    return false;
  }
  const event = await EventDAO.readEventBySlug(slug);
  return isUserOrganizer(event, user);
};

const isAuthorizedToReadEventParticipants = async (eventId: string | undefined, user: User) => {
  if (!eventId) {
    return false;
  }
  const [event, participants] = await Promise.all([EventDAO.readEventById(eventId), EventParticipantDAO.readByEvent(eventId)]);
  if (isUserOrganizer(event, user)) {
    return true;
  }
  return participants.some((participant) => participant.userId === user.userId);
};
