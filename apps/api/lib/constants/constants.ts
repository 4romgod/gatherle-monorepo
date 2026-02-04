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

export const GRAPHQL_API_PATH = '/v1/graphql';

export const REGEX_PHONE_NUMBER = /^\+\d{1,3}\d{3,14}$/;
export const REGEX_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEXT_MONGO_DB_ERROR = /\{ (.*?): (.*?) \}/;

/**
 * Structured GraphQL operation names organized by domain.
 * Use this for domain-specific operation lookups.
 */
export const OPERATIONS = {
  USER: {
    CREATE_USER: 'createUser',
    LOGIN_USER: 'loginUser',
    UPDATE_USER: 'updateUser',
    DELETE_USER_BY_ID: 'deleteUserById',
    DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
    DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    READ_USER_BY_ID: 'readUserById',
    READ_USER_BY_EMAIL: 'readUserByEmail',
    READ_USER_BY_USERNAME: 'readUserByUsername',
    READ_USERS: 'readUsers',
    READ_BLOCKED_USERS: 'readBlockedUsers',
    READ_MUTED_USERS: 'readMutedUsers',
    READ_MUTED_ORGANIZATION_IDS: 'readMutedOrganizationIds',
    READ_SESSION_STATE: 'readSessionState',
    READ_ALL_SESSION_STATES: 'readAllSessionStates',
  },
  EVENT: {
    CREATE_EVENT: 'createEvent',
    UPDATE_EVENT: 'updateEvent',
    DELETE_EVENT: 'deleteEventById',
    DELETE_EVENT_BY_SLUG: 'deleteEventBySlug',
    READ_EVENT_BY_ID: 'readEventById',
    READ_EVENT_BY_SLUG: 'readEventBySlug',
    READ_EVENTS: 'readEvents',
  },
  EVENT_CATEGORY: {
    CREATE_EVENT_CATEGORY: 'createEventCategory',
    UPDATE_EVENT_CATEGORY: 'updateEventCategory',
    DELETE_EVENT_CATEGORY_BY_ID: 'deleteEventCategoryById',
    DELETE_EVENT_CATEGORY_BY_SLUG: 'deleteEventCategoryBySlug',
    READ_EVENT_CATEGORY_BY_ID: 'readEventCategoryById',
    READ_EVENT_CATEGORY_BY_SLUG: 'readEventCategoryBySlug',
    READ_EVENT_CATEGORIES: 'readEventCategories',
  },
  EVENT_CATEGORY_GROUP: {
    CREATE_EVENT_CATEGORY_GROUP: 'createEventCategoryGroup',
    UPDATE_EVENT_CATEGORY_GROUP: 'updateEventCategoryGroup',
    DELETE_EVENT_CATEGORY_GROUP_BY_SLUG: 'deleteEventCategoryGroupBySlug',
    READ_EVENT_CATEGORY_GROUP_BY_SLUG: 'readEventCategoryGroupBySlug',
    READ_EVENT_CATEGORY_GROUPS: 'readEventCategoryGroups',
  },
  EVENT_PARTICIPANT: {
    UPSERT_EVENT_PARTICIPANT: 'upsertEventParticipant',
    CANCEL_EVENT_PARTICIPANT: 'cancelEventParticipant',
    READ_EVENT_PARTICIPANTS: 'readEventParticipants',
  },
  ORGANIZATION: {
    CREATE_ORGANIZATION: 'createOrganization',
    UPDATE_ORGANIZATION: 'updateOrganization',
    DELETE_ORGANIZATION: 'deleteOrganizationById',
    READ_ORGANIZATION_BY_ID: 'readOrganizationById',
    READ_ORGANIZATION_BY_SLUG: 'readOrganizationBySlug',
    READ_ORGANIZATIONS: 'readOrganizations',
  },
  ORGANIZATION_MEMBERSHIP: {
    CREATE_ORGANIZATION_MEMBERSHIP: 'createOrganizationMembership',
    UPDATE_ORGANIZATION_MEMBERSHIP: 'updateOrganizationMembership',
    DELETE_ORGANIZATION_MEMBERSHIP: 'deleteOrganizationMembership',
    READ_ORGANIZATION_MEMBERSHIP_BY_ID: 'readOrganizationMembershipById',
    READ_ORGANIZATION_MEMBERSHIPS_BY_ORG_ID: 'readOrganizationMembershipsByOrgId',
  },
  VENUE: {
    CREATE_VENUE: 'createVenue',
    UPDATE_VENUE: 'updateVenue',
    DELETE_VENUE: 'deleteVenueById',
    READ_VENUE_BY_ID: 'readVenueById',
    READ_VENUE_BY_SLUG: 'readVenueBySlug',
    READ_VENUES: 'readVenues',
    READ_VENUES_BY_ORG_ID: 'readVenuesByOrgId',
  },
  FOLLOW: {
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
    ACCEPT_FOLLOW_REQUEST: 'acceptFollowRequest',
    REJECT_FOLLOW_REQUEST: 'rejectFollowRequest',
    REMOVE_FOLLOWER: 'removeFollower',
    READ_FOLLOWING: 'readFollowing',
    READ_PENDING_FOLLOW_REQUESTS: 'readPendingFollowRequests',
    READ_FOLLOW_REQUESTS: 'readFollowRequests',
    READ_FOLLOWERS: 'readFollowers',
    READ_SAVED_EVENTS: 'readSavedEvents',
  },
  ACTIVITY: {
    LOG_ACTIVITY: 'logActivity',
    READ_ACTIVITIES_BY_ACTOR: 'readActivitiesByActor',
    READ_FEED: 'readFeed',
  },
  INTENT: {
    UPSERT_INTENT: 'upsertIntent',
    READ_INTENTS_BY_USER: 'readIntentsByUser',
    READ_INTENTS_BY_EVENT: 'readIntentsByEvent',
  },
  NOTIFICATION: {
    MARK_NOTIFICATION_READ: 'markNotificationRead',
    MARK_ALL_NOTIFICATIONS_READ: 'markAllNotificationsRead',
    DELETE_NOTIFICATION: 'deleteNotification',
    READ_NOTIFICATIONS: 'readNotifications',
  },
  ADMIN: {
    READ_ADMIN_DASHBOARD_STATS: 'readAdminDashboardStats',
  },
} as const;

export const ANSI_COLOR_CODES = {
  BLACK: '\x1b[30m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
  GREEN: '\x1b[32m',
  MAGENTA: '\x1b[35m',
  RED: '\x1b[31m',
  WHITE: '\x1b[37m',
  YELLOW: '\x1b[33m',
};

export const HTTP_METHOD_COLOR_MAP = {
  DELETE: ANSI_COLOR_CODES.RED,
  GET: ANSI_COLOR_CODES.BLUE,
  HEAD: ANSI_COLOR_CODES.WHITE,
  PATCH: ANSI_COLOR_CODES.CYAN,
  POST: ANSI_COLOR_CODES.GREEN,
  PUT: ANSI_COLOR_CODES.MAGENTA,
};

export const RESOLVE_TIME_COLOR_MAP = [
  { threshold: 250, color: ANSI_COLOR_CODES.GREEN },
  { threshold: 500, color: ANSI_COLOR_CODES.YELLOW },
  { threshold: 1000, color: ANSI_COLOR_CODES.MAGENTA },
  { threshold: Infinity, color: ANSI_COLOR_CODES.RED },
];

export const STATUS_CODE_COLOR_MAP = [
  { range: /^2\d{2}$/, color: ANSI_COLOR_CODES.GREEN },
  { range: /^3\d{2}$/, color: ANSI_COLOR_CODES.CYAN },
  { range: /^4\d{2}$/, color: ANSI_COLOR_CODES.YELLOW },
  { range: /^5\d{2}$/, color: ANSI_COLOR_CODES.RED },
];

export const SECRET_KEYS = {
  MONGO_DB_URL: 'MONGO_DB_URL',
  JWT_SECRET: 'JWT_SECRET',
};

export const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};
