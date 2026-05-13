const APP_NAMESPACE = 'gatherle';

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const PING_INTERVAL_MS = 30000;
export const WEBSOCKET_AUTH_PROTOCOL_PREFIX = `${APP_NAMESPACE}.jwt.`;

export const normalizeWebSocketBaseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`;
  }

  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`;
  }

  return trimmed;
};

export const buildWebSocketAuthProtocols = (token: string): string[] => {
  return [`${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${token}`];
};

export const computeReconnectDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 500);
  return exponentialDelay + jitter;
};

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
  );
}

export function resolveMobileWebsocketBaseUrl(
  explicitValue?: string | null,
  graphQlUrl?: string | null,
): {
  websocketBaseUrl: string | null;
  websocketSource: 'explicit' | 'derived-local' | 'missing';
} {
  const normalizedExplicit = normalizeWebSocketBaseUrl(explicitValue ?? '');
  if (normalizedExplicit) {
    return {
      websocketBaseUrl: normalizedExplicit,
      websocketSource: 'explicit',
    };
  }

  if (!graphQlUrl) {
    return {
      websocketBaseUrl: null,
      websocketSource: 'missing',
    };
  }

  try {
    const parsedUrl = new URL(graphQlUrl);
    if (!isLocalHostname(parsedUrl.hostname)) {
      return {
        websocketBaseUrl: null,
        websocketSource: 'missing',
      };
    }

    const protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
    const websocketUrl = new URL(`${protocol}//${parsedUrl.hostname}:${port}/local`);

    return {
      websocketBaseUrl: websocketUrl.toString().replace(/\/$/, ''),
      websocketSource: 'derived-local',
    };
  } catch {
    return {
      websocketBaseUrl: null,
      websocketSource: 'missing',
    };
  }
}
