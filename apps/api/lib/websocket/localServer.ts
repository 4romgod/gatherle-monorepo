import type { APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { randomUUID } from 'crypto';
import type { IncomingHttpHeaders, IncomingMessage, Server } from 'http';
import WebSocket, { WebSocketServer, type RawData } from 'ws';
import { WebSocketCloseCode } from '@/constants';
import { logger } from '@/utils/logger';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { websocketLambdaHandler } from '@/websocket/lambdaHandler';
import {
  LOCAL_WEBSOCKET_DOMAIN_NAME,
  registerLocalConnection,
  unregisterLocalConnection,
} from '@/websocket/localGateway';
import type { WebSocketRequestEvent } from '@/websocket/types';

const LOCAL_WEBSOCKET_STAGE_FALLBACK = 'local';
const noopLambdaCallback = () => {};

interface ConnectionMetadata {
  connectionId: string;
  stage: string;
  queryStringParameters: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
}

interface WebSocketEvent {
  routeKey: string;
  eventType: 'CONNECT' | 'DISCONNECT' | 'MESSAGE';
  metadata: ConnectionMetadata;
  body?: string;
}

const toHeaderRecord = (headers: IncomingHttpHeaders): Record<string, string | undefined> => {
  const normalized: Record<string, string | undefined> = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
      return;
    }

    normalized[key] = value;
  });

  return normalized;
};

const parseRequestUrl = (request: IncomingMessage): URL => {
  const host = request.headers.host ?? 'localhost';
  const path = request.url ?? '/';
  return new URL(path, `http://${host}`);
};

const extractStageFromPath = (pathname: string): string => {
  const firstPathSegment = pathname
    .split('/')
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 0);

  return firstPathSegment ?? LOCAL_WEBSOCKET_STAGE_FALLBACK;
};

const toQueryStringParameters = (url: URL): Record<string, string | undefined> => {
  const params: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

const getRouteKeyFromMessageBody = (body: string): string => {
  try {
    const parsed = JSON.parse(body) as { action?: unknown };
    if (typeof parsed.action === 'string' && parsed.action.trim()) {
      return parsed.action;
    }
  } catch {
    // If payload is not valid JSON, send it to default route.
  }

  return WEBSOCKET_ROUTES.DEFAULT;
};

const buildWebSocketEvent = ({ routeKey, eventType, metadata, body }: WebSocketEvent): WebSocketRequestEvent => {
  return {
    version: '2.0',
    routeKey,
    rawPath: `/${metadata.stage}`,
    rawQueryString: '',
    headers: metadata.headers,
    requestContext: {
      routeKey,
      eventType,
      connectionId: metadata.connectionId,
      domainName: LOCAL_WEBSOCKET_DOMAIN_NAME,
      stage: metadata.stage,
      apiId: 'local-websocket-api',
      requestId: randomUUID(),
      requestTime: new Date().toUTCString(),
      requestTimeEpoch: Date.now(),
      messageId: eventType === 'MESSAGE' ? randomUUID() : undefined,
      connectedAt: Date.now(),
    },
    body,
    isBase64Encoded: false,
    queryStringParameters: metadata.queryStringParameters,
  } as unknown as WebSocketRequestEvent;
};

const invokeLambdaHandler = async ({
  routeKey,
  eventType,
  metadata,
  body,
}: WebSocketEvent): Promise<APIGatewayProxyResultV2> => {
  const event = buildWebSocketEvent({ routeKey, eventType, metadata, body });
  const context = { awsRequestId: randomUUID() } as Context;

  const result = await websocketLambdaHandler(event, context, noopLambdaCallback);
  return (
    result ?? {
      statusCode: 200,
      body: JSON.stringify({ message: 'ok' }),
    }
  );
};

const closeConnectionWithStatus = (socket: WebSocket, statusCode: number): void => {
  if (statusCode === 401) {
    socket.close(WebSocketCloseCode.APP_UNAUTHORIZED, 'Unauthorized');
    return;
  }

  if (statusCode >= 400 && statusCode < 500) {
    socket.close(WebSocketCloseCode.APP_BAD_REQUEST, 'Bad request');
    return;
  }

  socket.close(WebSocketCloseCode.INTERNAL_SERVER_ERROR, 'Internal server error');
};

const toMessageString = (data: RawData): string => {
  try {
    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('utf8');
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }

    return data.toString('utf8');
  } catch (error) {
    logger.error('Failed to convert websocket message data to string', {
      dataType: typeof data,
      isArrayBuffer: data instanceof ArrayBuffer,
      isArray: Array.isArray(data),
      error,
    });
    throw new Error('Unable to decode websocket message data');
  }
};

export const startLocalWebSocketServer = (httpServer: Server): WebSocketServer => {
  const webSocketServer = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit('connection', ws, request);
    });
  });

  webSocketServer.on('connection', async (socket, request) => {
    const parsedUrl = parseRequestUrl(request);
    const connectionMetadata: ConnectionMetadata = {
      connectionId: randomUUID(),
      stage: extractStageFromPath(parsedUrl.pathname),
      queryStringParameters: toQueryStringParameters(parsedUrl),
      headers: toHeaderRecord(request.headers),
    };

    try {
      const connectResult = await invokeLambdaHandler({
        routeKey: WEBSOCKET_ROUTES.CONNECT,
        eventType: 'CONNECT',
        metadata: connectionMetadata,
      });

      const isConnectStatusString = typeof connectResult === 'string';
      const connectStatusCode = isConnectStatusString ? 200 : (connectResult.statusCode ?? 500);
      if (connectStatusCode >= 400) {
        logger.warn('Rejected local websocket connection', {
          connectionId: connectionMetadata.connectionId,
          stage: connectionMetadata.stage,
          statusCode: connectStatusCode,
        });
        closeConnectionWithStatus(socket, connectStatusCode);
        return;
      }

      registerLocalConnection(connectionMetadata.connectionId, (serializedPayload) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(serializedPayload);
        }
      });

      logger.info('Accepted local websocket connection', {
        connectionId: connectionMetadata.connectionId,
        stage: connectionMetadata.stage,
      });

      socket.on('message', async (raw) => {
        try {
          const body = toMessageString(raw);
          const routeKey = getRouteKeyFromMessageBody(body);

          await invokeLambdaHandler({
            routeKey,
            eventType: 'MESSAGE',
            metadata: connectionMetadata,
            body,
          });
        } catch (error) {
          logger.error('Failed to process local websocket message', {
            connectionId: connectionMetadata.connectionId,
            error,
          });
        }
      });

      socket.on('close', async () => {
        unregisterLocalConnection(connectionMetadata.connectionId);

        try {
          await invokeLambdaHandler({
            routeKey: WEBSOCKET_ROUTES.DISCONNECT,
            eventType: 'DISCONNECT',
            metadata: connectionMetadata,
          });
        } catch (error) {
          logger.warn('Failed to process local websocket disconnect', {
            connectionId: connectionMetadata.connectionId,
            error,
          });
        }
      });
    } catch (error) {
      unregisterLocalConnection(connectionMetadata.connectionId);
      logger.error('Failed to initialize local websocket connection', {
        connectionId: connectionMetadata.connectionId,
        error,
      });
      socket.close(WebSocketCloseCode.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  });

  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 'unknown';
  logger.info('Local websocket server attached to API HTTP server', {
    websocketUrlExample: `ws://localhost:${port}/${LOCAL_WEBSOCKET_STAGE_FALLBACK}`,
    authHeader: 'Sec-WebSocket-Protocol: gatherle.jwt.<jwt>',
  });

  return webSocketServer;
};
