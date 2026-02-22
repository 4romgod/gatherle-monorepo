const FALLBACK_CONNECTION_TTL_HOURS = 24;
const parsedTtl = Number.parseInt(process.env.WEBSOCKET_CONNECTION_TTL_HOURS ?? '', 10);

export const CONNECTION_TTL_HOURS =
  Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : FALLBACK_CONNECTION_TTL_HOURS;

export const WEBSOCKET_AUTH_PROTOCOL_PREFIX = 'gatherle.jwt.';
export const CHAT_MESSAGE_MAX_LENGTH = 2000;

export const WEBSOCKET_ROUTES = {
  CONNECT: '$connect',
  DISCONNECT: '$disconnect',
  DEFAULT: '$default',
  PING: 'ping',
  NOTIFICATION_SUBSCRIBE: 'notification.subscribe',
  CHAT_SEND: 'chat.send',
  CHAT_READ: 'chat.read',
} as const;

export const WEBSOCKET_EVENT_TYPES = {
  NOTIFICATION_NEW: 'notification.new',
  CHAT_MESSAGE: 'chat.message',
  CHAT_READ: 'chat.read',
  CHAT_CONVERSATION_UPDATED: 'chat.conversation.updated',
  EVENT_RSVP_UPDATED: 'event.rsvp.updated',
  FOLLOW_REQUEST_CREATED: 'follow.request.created',
  FOLLOW_REQUEST_UPDATED: 'follow.request.updated',
  PING_PONG: 'ping.pong',
} as const;
