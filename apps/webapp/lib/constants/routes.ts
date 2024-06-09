export const ROUTES = {
  ACCOUNT: {
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
};
