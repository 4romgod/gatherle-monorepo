import type { ServerContext } from '@/graphql';
import type { ArgsDictionary, ResolverData } from 'type-graphql';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import { ERROR_MESSAGES } from '@/validation';
import { OPERATIONS, SECRET_KEYS } from '@/constants';
import type { User } from '@gatherle/commons/types';
import { UserRole, OrganizationRole } from '@gatherle/commons/types';
import { verify, sign } from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { EventDAO, EventParticipantDAO, OrganizationDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import { getConfigValue } from '@/clients';
import { Types } from 'mongoose';
import { logger } from '@/utils/logger';

const operationsRequiringOwnership = new Set<string>([
  // User operations
  OPERATIONS.USER.UPDATE_USER,
  OPERATIONS.USER.DELETE_USER_BY_ID,
  OPERATIONS.USER.DELETE_USER_BY_EMAIL,
  OPERATIONS.USER.DELETE_USER_BY_USERNAME,
  // Event operations
  OPERATIONS.EVENT.UPDATE_EVENT,
  OPERATIONS.EVENT.DELETE_EVENT,
  OPERATIONS.EVENT.DELETE_EVENT_BY_SLUG,
  OPERATIONS.EVENT.CREATE_EVENT,
  // Event participant operations
  OPERATIONS.EVENT_PARTICIPANT.UPSERT_EVENT_PARTICIPANT,
  OPERATIONS.EVENT_PARTICIPANT.CANCEL_EVENT_PARTICIPANT,
  OPERATIONS.EVENT_PARTICIPANT.READ_EVENT_PARTICIPANTS,
  // Organization operations
  OPERATIONS.ORGANIZATION.CREATE_ORGANIZATION,
  OPERATIONS.ORGANIZATION.UPDATE_ORGANIZATION,
  OPERATIONS.ORGANIZATION.DELETE_ORGANIZATION,
  // Organization membership operations
  OPERATIONS.ORGANIZATION_MEMBERSHIP.CREATE_ORGANIZATION_MEMBERSHIP,
  OPERATIONS.ORGANIZATION_MEMBERSHIP.UPDATE_ORGANIZATION_MEMBERSHIP,
  OPERATIONS.ORGANIZATION_MEMBERSHIP.DELETE_ORGANIZATION_MEMBERSHIP,
  // Venue operations
  OPERATIONS.VENUE.CREATE_VENUE,
  OPERATIONS.VENUE.UPDATE_VENUE,
  OPERATIONS.VENUE.DELETE_VENUE,
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
  const { context, args, info } = resolverData;
  const token = context.token;
  const user = context.user;
  const operationName = info.fieldName;

  logger.debug(`[authChecker] ${operationName}: token present=${!!token}, user present=${!!context.user}`);

  if (token && user) {
    const userRole = user.userRole;

    // Attach verified user to context so resolvers can access it
    context.user = user;

    if (!roles.includes(userRole)) {
      logger.debug(`${userRole} type user: '${user.username}' was denied for operation ${operationName}`);
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    if (user.userRole === UserRole.Admin) {
      logger.debug(`${user.userRole} type user: '${user.username}' has permission for operation ${operationName}`);
      return true;
    }

    if (operationsRequiringOwnership.has(operationName)) {
      const isAuthorized = await isAuthorizedByOperation(info.fieldName, args, user);
      if (isAuthorized) {
        logger.debug(
          `${userRole} type user: '${user.username}' has 'isAuthorizedByOperation' permission for operation ${operationName}`,
        );
        return true;
      }
      logger.debug(`${userRole} type user: '${user.username}' was denied for operation ${operationName}`);
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }

    // Operation doesn't require ownership, user role is valid, allow access
    logger.debug(
      `${userRole} type user: '${user.username}' has permission for operation ${operationName}. All users allowed.`,
    );
    return true;
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
  // TODO(security): Implement JWT-claims hardening in the next patch by signing only minimal auth claims
  // (for example userId, email, username, userRole, isTestUser) instead of the full user object.
  logger.debug('Generating JWT token', { userId: user.userId, username: user.username, expiresIn });
  const jwtSecret: Secret | undefined = secret ?? (await getConfigValue(SECRET_KEYS.JWT_SECRET));
  if (!jwtSecret) {
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
  const tokenExpiry: StringValue | number = (expiresIn ?? '7d') as StringValue | number;
  const signOptions: SignOptions = { expiresIn: tokenExpiry };
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
    const { iat: _iat, exp: _exp, ...user } = verify(token, jwtSecret) as JwtPayload;
    return user as User;
  } catch (error) {
    logger.debug('Error when verifying token', { error });
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
};

export const isAuthorizedByOperation = async (
  operationName: string,
  args: ArgsDictionary,
  user: User,
): Promise<boolean> => {
  switch (operationName) {
    // User operations
    case OPERATIONS.USER.UPDATE_USER:
      return args.input.userId == user.userId;
    case OPERATIONS.USER.DELETE_USER_BY_ID:
      return args.userId == user.userId;
    case OPERATIONS.USER.DELETE_USER_BY_EMAIL:
      return args.email == user.email;
    case OPERATIONS.USER.DELETE_USER_BY_USERNAME:
      return args.username == user.username;
    // Event operations
    case OPERATIONS.EVENT.UPDATE_EVENT:
    case OPERATIONS.EVENT.DELETE_EVENT:
      return await isAuthorizedByEventId(args.eventId ?? args.input?.eventId, user);
    case OPERATIONS.EVENT.DELETE_EVENT_BY_SLUG:
      return await isAuthorizedByEventSlug(args.slug, user);
    case OPERATIONS.EVENT.CREATE_EVENT:
      return true;
    // Event participant operations
    case OPERATIONS.EVENT_PARTICIPANT.UPSERT_EVENT_PARTICIPANT:
    case OPERATIONS.EVENT_PARTICIPANT.CANCEL_EVENT_PARTICIPANT:
      return args.input?.userId === user.userId;
    case OPERATIONS.EVENT_PARTICIPANT.READ_EVENT_PARTICIPANTS:
      return await isAuthorizedToReadEventParticipants(args.eventId, user);
    // Organization operations
    case OPERATIONS.ORGANIZATION.CREATE_ORGANIZATION:
      return true; // Any authenticated user can create an organization
    case OPERATIONS.ORGANIZATION.UPDATE_ORGANIZATION:
      return await isAuthorizedToManageOrganization(args.input?.orgId, user);
    case OPERATIONS.ORGANIZATION.DELETE_ORGANIZATION:
      return await isAuthorizedToManageOrganization(args.orgId, user);
    // Organization membership operations
    case OPERATIONS.ORGANIZATION_MEMBERSHIP.CREATE_ORGANIZATION_MEMBERSHIP:
      return await isAuthorizedToManageOrganization(args.input?.orgId, user);
    case OPERATIONS.ORGANIZATION_MEMBERSHIP.UPDATE_ORGANIZATION_MEMBERSHIP:
    case OPERATIONS.ORGANIZATION_MEMBERSHIP.DELETE_ORGANIZATION_MEMBERSHIP:
      return await isAuthorizedToManageMembership(args.input?.membershipId, user);
    // Venue operations
    case OPERATIONS.VENUE.CREATE_VENUE:
      return await isAuthorizedToManageOrganization(args.input?.orgId, user);
    case OPERATIONS.VENUE.UPDATE_VENUE:
      return await isAuthorizedToManageVenue(args.input?.venueId, user);
    case OPERATIONS.VENUE.DELETE_VENUE:
      return await isAuthorizedToManageVenue(args.venueId, user);
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

const getOrganizerIdsFromEvent = (event: { organizers?: Array<{ user?: any }> }): string[] => {
  if (!event.organizers) {
    return [];
  }
  return event.organizers
    .map((organizer) => {
      const user = organizer.user;
      if (typeof user === 'string') return user;
      if (user && typeof user === 'object' && 'userId' in user) return user.userId;
      if (user && typeof user === 'object' && 'toString' in user) return user.toString(); // ObjectId
      return undefined;
    })
    .filter((id): id is string => Boolean(id));
};

const isUserOrganizer = (event: { organizers?: Array<{ user?: any }> }, user: User) => {
  const organizerIds = getOrganizerIdsFromEvent(event);
  return organizerIds.includes(user.userId);
};

/**
 * Check if a user is authorized to manage an organization (update/delete).
 * User is authorized if they are:
 * - The organization owner (ownerId matches user.userId)
 * - An Admin member of the organization
 *
 * @param orgId - The organization ID to check
 * @param user - The user attempting the operation
 * @returns true if authorized, false otherwise
 */
const isAuthorizedToManageOrganization = async (orgId: string | undefined, user: User): Promise<boolean> => {
  if (!orgId) {
    return false;
  }

  if (user.userRole === UserRole.Admin) {
    return true;
  }

  try {
    // Check if user is the owner
    const organization = await OrganizationDAO.readOrganizationById(orgId);
    if (organization.ownerId === user.userId) {
      return true;
    }

    // Check if user has Admin role in the organization
    const memberships = await OrganizationMembershipDAO.readMembershipsByOrgId(orgId);
    const userMembership = memberships.find((m) => m.userId === user.userId);

    return userMembership?.role === OrganizationRole.Owner || userMembership?.role === OrganizationRole.Admin;
  } catch (error) {
    logger.debug(`Error checking organization authorization for user ${user.userId} on org ${orgId}`, { error });
    return false;
  }
};

/**
 * Check if a user is authorized to manage a venue (update/delete).
 * Fetches the venue to find the orgId, then checks if user can manage that organization.
 *
 * @param venueId - The venue ID to check
 * @param user - The user attempting the operation
 * @returns true if authorized, false otherwise
 */
const isAuthorizedToManageVenue = async (venueId: string | undefined, user: User): Promise<boolean> => {
  if (!venueId) {
    return false;
  }

  try {
    const { VenueDAO } = await import('@/mongodb/dao');
    const venue = await VenueDAO.readVenueById(venueId);

    // If venue has no organization, only admins can manage it
    if (!venue.orgId) {
      return false;
    }

    return await isAuthorizedToManageOrganization(venue.orgId, user);
  } catch (error) {
    logger.debug(`Error checking venue authorization for user ${user.userId} on venue ${venueId}`, { error });
    return false;
  }
};

/**
 * Check if a user is authorized to manage a membership (update/delete).
 * Fetches the membership to find the orgId, then checks if user can manage that organization.
 *
 * @param membershipId - The membership ID to check
 * @param user - The user attempting the operation
 * @returns true if authorized, false otherwise
 */
const isAuthorizedToManageMembership = async (membershipId: string | undefined, user: User): Promise<boolean> => {
  if (!membershipId) {
    return false;
  }

  try {
    const membership = await OrganizationMembershipDAO.readMembershipById(membershipId);
    return await isAuthorizedToManageOrganization(membership.orgId, user);
  } catch (error) {
    logger.debug(`Error checking membership authorization for user ${user.userId} on membership ${membershipId}`, {
      error,
    });
    return false;
  }
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
  const [event, participants] = await Promise.all([
    EventDAO.readEventById(eventId),
    EventParticipantDAO.readByEvent(eventId),
  ]);
  if (isUserOrganizer(event, user)) {
    return true;
  }
  return participants.some((participant) => participant.userId === user.userId);
};

/**
 * Retrieves the authenticated user from context.
 * Should only be called in resolvers decorated with @Authorized, which ensures context.user is populated.
 *
 * @param context - GraphQL server context containing the verified user (set by authChecker).
 * @returns The authenticated User object.
 * @throws CustomError with UNAUTHENTICATED type if user is not in context (should never happen with @Authorized).
 */
export const getAuthenticatedUser = (context: ServerContext): User => {
  if (!context?.user) {
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
  return context.user;
};
