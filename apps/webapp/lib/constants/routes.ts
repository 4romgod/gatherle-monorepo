export const ROUTES = {
  ACCOUNT: {
    SETTINGS: '/account?tab=settings',
    TAB: (tab: string) => `/account?tab=${encodeURIComponent(tab)}`,
    PROFILE_EVENTS_TAB: (tab: string) => `/account?eventsTab=${encodeURIComponent(tab)}`,
    EVENTS: {
      EVENT: (slug: string) => `/account/events/${slug}`,
      EDIT_EVENT: (slug: string) => `/account/events/${slug}/edit`,
      SESSIONS: (slug: string) => `/account/events/${slug}/sessions`,
      ROOT: '/account?eventsTab=hosted',
      CREATE: '/account/events/create',
    },
    ORGANIZATIONS: {
      ROOT: '/account/organizations',
      ORG: (slug: string) => `/account/organizations/${slug}`,
      SETTINGS: (slug: string) => `/account/organizations/${slug}/settings`,
      CREATE: '/account/organizations/create',
    },
    MESSAGES: '/account/messages',
    MESSAGE_WITH_USERNAME: (username: string) => `/account/messages/${encodeURIComponent(username)}`,
    NOTIFICATIONS: '/account/notifications',
    ROOT: '/account',
  },
  API_AUTH_PREFIX: '/api/auth',
  AUTH: {
    FORGOT_PASSWORD: '/auth/forgot-password',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    VERIFY_EMAIL_PENDING: '/auth/verify-email/pending',
  },
  EVENTS: {
    EVENT: (slug: string) => `/events/${slug}`,
    ROOT: '/events',
    ATTENDEES: (slug: string) => `/events/${slug}/attendees`,
  },
  MOMENTS: {
    ROOT: '/moments',
  },
  CATEGORIES: {
    ROOT: '/categories',
    CATEGORY: (slug: string) => `/categories/${slug}`,
  },
  USERS: {
    USER: (username: string) => `/users/${username}`,
    USER_EVENTS: (username: string) => `/users/${username}/events`,
    USER_FOLLOWERS: (username: string) => `/users/${username}/followers`,
    USER_FOLLOWING: (username: string) => `/users/${username}/following`,
    ROOT: '/users',
  },
  ROOT: '/',
  HOME: '/home',
  ORGANIZATIONS: {
    ROOT: '/organizations',
    ORG: (slug: string) => `/organizations/${slug}`,
  },
  VENUES: {
    ROOT: '/venues',
    VENUE: (slug: string) => `/venues/${slug}`,
    EDIT: (slug: string) => `/venues/${slug}/edit`,
    ADD: '/venues/add',
  },
  ADMIN: {
    ROOT: '/admin',
    TAB: (tab: string) => `/admin?tab=${encodeURIComponent(tab)}`,
  },
};

/** Returns true when the pathname is an individual chat thread (e.g. /account/messages/alice). */
export function isIndividualChatRoute(pathname: string | null | undefined): boolean {
  return /^\/account\/messages\/[^/]+\/?$/.test(pathname ?? '');
}
