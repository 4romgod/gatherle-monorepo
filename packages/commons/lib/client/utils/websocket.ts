export type ResolvedWebsocketBaseUrl = {
  websocketBaseUrl: string | null;
  websocketSource: 'explicit' | 'derived-local' | 'derived-remote' | 'missing';
};

export type ResolveRealtimeWebsocketBaseUrlOptions = {
  explicitValue?: string | null;
  graphQlUrl?: string | null;
  upgradeInsecureRemoteExplicitUrls?: boolean;
};

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

function deriveGatherleRemoteWebsocketUrl(parsedUrl: URL): string | null {
  const graphQlHostname = parsedUrl.hostname;

  // Remote auto-derivation is intentionally narrow. Gatherle can safely derive
  // `ws.<stage>.<region>...` only from the canonical `api.<stage>.<region>...`
  // GraphQL host pattern. Other deployed GraphQL hosts, including execute-api
  // endpoints, may point at a different API Gateway API ID and therefore require
  // an explicit websocket URL.
  if (!graphQlHostname.startsWith('api.')) {
    return null;
  }

  const websocketHostname = `ws.${graphQlHostname.slice('api.'.length)}`;
  const protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const websocketUrl = new URL(`${protocol}//${websocketHostname}`);

  return websocketUrl.toString().replace(/\/$/, '');
}

function upgradeInsecureRemoteWebsocketUrlIfNeeded(
  normalizedExplicit: string,
  graphQlUrl?: string | null,
  enabled: boolean = false,
): string {
  if (!enabled || !graphQlUrl) {
    return normalizedExplicit;
  }

  try {
    const explicitUrl = new URL(normalizedExplicit);
    const parsedGraphQlUrl = new URL(graphQlUrl);

    if (
      parsedGraphQlUrl.protocol === 'https:' &&
      explicitUrl.protocol === 'ws:' &&
      !isLocalHostname(explicitUrl.hostname)
    ) {
      explicitUrl.protocol = 'wss:';
      return explicitUrl.toString().replace(/\/$/, '');
    }
  } catch {
    return normalizedExplicit;
  }

  return normalizedExplicit;
}

export function resolveRealtimeWebsocketBaseUrl(
  options: ResolveRealtimeWebsocketBaseUrlOptions = {},
): ResolvedWebsocketBaseUrl {
  const { explicitValue, graphQlUrl, upgradeInsecureRemoteExplicitUrls = false } = options;
  const normalizedExplicit = normalizeWebSocketBaseUrl(explicitValue ?? '');

  if (normalizedExplicit) {
    return {
      websocketBaseUrl: upgradeInsecureRemoteWebsocketUrlIfNeeded(
        normalizedExplicit,
        graphQlUrl,
        upgradeInsecureRemoteExplicitUrls,
      ),
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
      const remoteWebsocketUrl = deriveGatherleRemoteWebsocketUrl(parsedUrl);

      return {
        websocketBaseUrl: remoteWebsocketUrl,
        websocketSource: remoteWebsocketUrl ? 'derived-remote' : 'missing',
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
