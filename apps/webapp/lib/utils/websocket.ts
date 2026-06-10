/**
 * WebSocket utility functions for realtime connections
 */
import {
  normalizeWebSocketBaseUrl as normalizeSharedWebSocketBaseUrl,
  resolveRealtimeWebsocketBaseUrl,
} from '@gatherle/commons/client/utils';
import { APP_NAMESPACE } from '@/lib/constants/app';

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const PING_INTERVAL_MS = 30000;
export const WEBSOCKET_AUTH_PROTOCOL_PREFIX = `${APP_NAMESPACE}.jwt.`;

/**
 * Normalizes a WebSocket URL by converting http(s) protocols to ws(s)
 */
export const normalizeWebSocketBaseUrl = normalizeSharedWebSocketBaseUrl;

export function resolveWebappWebsocketBaseUrl(
  explicitValue?: string | null,
  graphQlUrl?: string | null,
): {
  websocketBaseUrl: string | null;
  websocketSource: 'explicit' | 'derived-local' | 'derived-remote' | 'missing';
} {
  return resolveRealtimeWebsocketBaseUrl({
    explicitValue,
    graphQlUrl,
    upgradeInsecureRemoteExplicitUrls: true,
  });
}

export const buildWebSocketAuthProtocols = (token: string): string[] => {
  return [`${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${token}`];
};

/**
 * Computes exponential backoff delay with jitter for WebSocket reconnection
 */
export const computeReconnectDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 500);
  return exponentialDelay + jitter;
};
