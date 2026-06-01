import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { AWS_REGION } from '@/constants';
import { LOCAL_WEBSOCKET_DOMAIN_NAME, postToLocalConnection } from '@/websocket/localGateway';

export interface WebSocketTargetConnection {
  connectionId: string;
  domainName: string;
  stage: string;
}

export interface RealtimeEventEnvelope<TPayload> {
  type: string;
  payload: TPayload;
  sentAt: string;
}

const managementClientCache = new Map<string, ApiGatewayManagementApiClient>();

const toManagementEndpoint = (domainName: string, stage: string): string => {
  const normalizedDomain = domainName.startsWith('http') ? domainName : `https://${domainName}`;
  const endpointUrl = new URL(normalizedDomain);
  const normalizedStage = stage.replace(/^\/+|\/+$/g, '');
  const pathSegments = endpointUrl.pathname.split('/').filter(Boolean);

  if (normalizedStage && pathSegments[pathSegments.length - 1] !== normalizedStage) {
    pathSegments.push(normalizedStage);
  }

  const normalizedPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  return `${endpointUrl.origin}${normalizedPath}`;
};

const getManagementClient = (domainName: string, stage: string): ApiGatewayManagementApiClient => {
  const endpoint = toManagementEndpoint(domainName, stage);
  const cachedClient = managementClientCache.get(endpoint);
  if (cachedClient) {
    return cachedClient;
  }

  const client = new ApiGatewayManagementApiClient({
    region: AWS_REGION,
    endpoint,
  });

  managementClientCache.set(endpoint, client);
  return client;
};

export const createRealtimeEventEnvelope = <TPayload>(
  type: string,
  payload: TPayload,
): RealtimeEventEnvelope<TPayload> => ({
  type,
  payload,
  sentAt: new Date().toISOString(),
});

export const isGoneConnectionError = (error: unknown): boolean => {
  const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  const errorName = (error as { name?: string })?.name;
  return statusCode === 410 || errorName === 'GoneException';
};

/**
 * Deduplicates connections by connectionId across multiple connection arrays.
 * Useful when broadcasting to multiple users who may share connections.
 */
export const deduplicateConnections = <T extends WebSocketTargetConnection>(
  ...connectionArrays: T[][]
): Map<string, T> => {
  const uniqueConnections = new Map<string, T>();
  connectionArrays.flat().forEach((connection) => {
    uniqueConnections.set(connection.connectionId, connection);
  });
  return uniqueConnections;
};

export const postToConnection = async <TPayload>(
  connection: WebSocketTargetConnection,
  payload: RealtimeEventEnvelope<TPayload>,
): Promise<void> => {
  if (connection.domainName === LOCAL_WEBSOCKET_DOMAIN_NAME) {
    await postToLocalConnection(connection.connectionId, payload);
    return;
  }

  const client = getManagementClient(connection.domainName, connection.stage);
  const command = new PostToConnectionCommand({
    ConnectionId: connection.connectionId,
    Data: Buffer.from(JSON.stringify(payload)),
  });

  await client.send(command);
};
