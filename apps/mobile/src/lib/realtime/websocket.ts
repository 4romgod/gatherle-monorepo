import {
  normalizeWebSocketBaseUrl as normalizeSharedWebSocketBaseUrl,
  resolveRealtimeWebsocketBaseUrl,
} from '@gatherle/commons/client/utils';

const APP_NAMESPACE = 'gatherle';

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const PING_INTERVAL_MS = 30000;
export const WEBSOCKET_AUTH_PROTOCOL_PREFIX = `${APP_NAMESPACE}.jwt.`;
export const WEBSOCKET_INSTALLATION_PROTOCOL_PREFIX = `${APP_NAMESPACE}.installation.`;

export const normalizeWebSocketBaseUrl = normalizeSharedWebSocketBaseUrl;

export const buildWebSocketAuthProtocols = (token: string, deviceInstallationId?: string | null): string[] => {
  const protocols = [`${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${token}`];
  const normalizedDeviceInstallationId = deviceInstallationId?.trim();

  if (normalizedDeviceInstallationId) {
    protocols.push(`${WEBSOCKET_INSTALLATION_PROTOCOL_PREFIX}${normalizedDeviceInstallationId}`);
  }

  return protocols;
};

export const computeReconnectDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 500);
  return exponentialDelay + jitter;
};

export function resolveMobileWebsocketBaseUrl(
  explicitValue?: string | null,
  graphQlUrl?: string | null,
): {
  websocketBaseUrl: string | null;
  websocketSource: 'explicit' | 'derived-local' | 'derived-remote' | 'missing';
} {
  return resolveRealtimeWebsocketBaseUrl({
    explicitValue,
    graphQlUrl,
  });
}
