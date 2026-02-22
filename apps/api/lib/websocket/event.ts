import { WEBSOCKET_AUTH_PROTOCOL_PREFIX } from '@/websocket/constants';
import type { WebSocketRequestEvent } from '@/websocket/types';

const parseProtocolHeaderForToken = (protocolHeader: string): string | undefined => {
  const protocols = protocolHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const protocol of protocols) {
    if (protocol.startsWith(WEBSOCKET_AUTH_PROTOCOL_PREFIX)) {
      const token = protocol.slice(WEBSOCKET_AUTH_PROTOCOL_PREFIX.length).trim();
      if (token) {
        return token;
      }
    }
  }

  return undefined;
};

export const extractToken = (event: WebSocketRequestEvent): string | undefined => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return token;
    }
  }

  const protocolHeader = event.headers?.['sec-websocket-protocol'] || event.headers?.['Sec-WebSocket-Protocol'];
  if (protocolHeader) {
    return parseProtocolHeaderForToken(protocolHeader);
  }

  return undefined;
};

export const getConnectionMetadata = (event: WebSocketRequestEvent) => {
  const { connectionId, domainName, stage } = event.requestContext;

  if (!connectionId || !domainName || !stage) {
    throw new Error('WebSocket request context is missing connection metadata');
  }

  return { connectionId, domainName, stage };
};
