export const ROUTES = {
  ACCOUNT: {
    EVENTS: {
      EVENT: (slug: string) => `/account/events/${slug}`,
      EDIT_EVENT: (slug: string) => `/account/events/${slug}/edit`,
      ROOT: '/account/events',
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
    PROFILE: '/account/profile',
    ROOT: '/account',
  },
  API_AUTH_PREFIX: '/api/auth',
  AUTH: {
    FORGOT_PASSWORD: '/auth/forgot-password',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
  },
  EVENTS: {
    EVENT: (slug: string) => `/events/${slug}`,
    ROOT: '/events',
    ATTENDEES: (slug: string) => `/events/${slug}/attendees`,
  },
  CATEGORIES: {
    ROOT: '/categories',
    CATEGORY: (slug: string) => `/categories/${slug}`,
  },
  USERS: {
    USER: (username: string) => `/users/${username}`,
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
    ADD: '/venues/add',
  },
  ADMIN: {
    ROOT: '/admin',
  },
};

/** Returns true when the pathname is an individual chat thread (e.g. /account/messages/alice). */
export function isIndividualChatRoute(pathname: string | null | undefined): boolean {
  return /^\/account\/messages\/[^/]+\/?$/.test(pathname ?? '');
}
