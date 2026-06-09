import { WEBSOCKET_AUTH_PROTOCOL_PREFIX, WEBSOCKET_INSTALLATION_PROTOCOL_PREFIX } from '@/websocket/constants';
import type { WebSocketRequestEvent } from '@/websocket/types';

export const getHeader = (
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lower);
  return key ? headers[key] : undefined;
};

const parseProtocolHeader = (protocolHeader: string): string[] =>
  protocolHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const findProtocolByPrefix = (event: WebSocketRequestEvent, prefix: string): string | undefined => {
  const protocolHeader = getHeader(event.headers, 'sec-websocket-protocol');
  if (!protocolHeader) {
    return undefined;
  }

  return parseProtocolHeader(protocolHeader).find((protocol) => protocol.startsWith(prefix));
};

export const extractProtocolValue = (event: WebSocketRequestEvent, prefix: string): string | undefined => {
  const matchingProtocol = findProtocolByPrefix(event, prefix);
  if (!matchingProtocol) {
    return undefined;
  }

  const value = matchingProtocol.slice(prefix.length).trim();
  return value || undefined;
};

export const extractToken = (event: WebSocketRequestEvent): string | undefined => {
  return extractProtocolValue(event, WEBSOCKET_AUTH_PROTOCOL_PREFIX);
};

export const extractDeviceInstallationId = (event: WebSocketRequestEvent): string | undefined =>
  extractProtocolValue(event, WEBSOCKET_INSTALLATION_PROTOCOL_PREFIX);

export const getConnectionMetadata = (event: WebSocketRequestEvent) => {
  const { connectionId, domainName, stage } = event.requestContext;

  if (!connectionId || !domainName || !stage) {
    throw new Error('WebSocket request context is missing connection metadata');
  }

  return { connectionId, domainName, stage };
};
