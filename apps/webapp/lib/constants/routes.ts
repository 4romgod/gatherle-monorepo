export const ROUTES = {
  ACCOUNT: {
    EVENTS: {
      EVENT: (slug: string) => `/account/events/${slug}`,
      EDIT_EVENT: (slug: string) => `/account/events/${slug}/edit`,
      ROOT: '/account/events',
      CREATE: '/account/events/create',
    },
    MESSAGES: '/account/messages',
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
  },
  USERS: {
    USER: (username: string) => `/users/${username}`,
    ROOT: '/users',
  },
  ROOT: '/',
  ORGANIZATIONS: {
    ROOT: '/organizations',
    ORG: (slug: string) => `/organizations/${slug}`,
  },
  VENUES: {
    ROOT: '/venues',
  },
};
