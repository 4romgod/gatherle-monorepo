import { WebSocketRequestThrottleDAO } from '@/mongodb/dao';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';

const ONE_MINUTE_MS = 60 * 1000;

type WebSocketRouteKey = (typeof WEBSOCKET_ROUTES)[keyof typeof WEBSOCKET_ROUTES];
type WebSocketRateLimitScope = 'connection' | 'user';

interface RouteRateLimitConfig {
  maxRequests: number;
  scopeTypes: WebSocketRateLimitScope[];
  windowMs: number;
}

const WEBSOCKET_ROUTE_RATE_LIMITS: Partial<Record<WebSocketRouteKey, RouteRateLimitConfig>> = {
  [WEBSOCKET_ROUTES.CONNECT]: {
    maxRequests: 12,
    scopeTypes: ['user'],
    windowMs: ONE_MINUTE_MS,
  },
  [WEBSOCKET_ROUTES.NOTIFICATION_SUBSCRIBE]: {
    maxRequests: 12,
    scopeTypes: ['connection'],
    windowMs: ONE_MINUTE_MS,
  },
  [WEBSOCKET_ROUTES.CHAT_SEND]: {
    maxRequests: 20,
    scopeTypes: ['connection', 'user'],
    windowMs: ONE_MINUTE_MS,
  },
  [WEBSOCKET_ROUTES.CHAT_READ]: {
    maxRequests: 60,
    scopeTypes: ['connection', 'user'],
    windowMs: ONE_MINUTE_MS,
  },
  [WEBSOCKET_ROUTES.PING]: {
    maxRequests: 120,
    scopeTypes: ['connection'],
    windowMs: ONE_MINUTE_MS,
  },
};

export interface WebSocketRateLimitSubject {
  connectionId?: string;
  userId?: string;
}

export const assertWebSocketRateLimit = async (
  routeKey: WebSocketRouteKey,
  subject: WebSocketRateLimitSubject,
  now = new Date(),
): Promise<void> => {
  const config = WEBSOCKET_ROUTE_RATE_LIMITS[routeKey];
  if (!config) {
    return;
  }

  const scopeKeys = config.scopeTypes.flatMap((scopeType) => {
    if (scopeType === 'connection' && subject.connectionId?.trim()) {
      return [WebSocketRequestThrottleDAO.buildScopeKey(routeKey, 'connection', subject.connectionId)];
    }

    if (scopeType === 'user' && subject.userId?.trim()) {
      return [WebSocketRequestThrottleDAO.buildScopeKey(routeKey, 'user', subject.userId)];
    }

    return [];
  });

  if (scopeKeys.length === 0) {
    return;
  }

  await WebSocketRequestThrottleDAO.assertAllowed(routeKey, scopeKeys, config, now);
};
