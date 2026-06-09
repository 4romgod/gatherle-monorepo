import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GraphQLError } from 'graphql';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';
import { ensureDatabaseConnection } from '@/websocket/database';
import { WEBSOCKET_EVENT_TYPES, WEBSOCKET_ROUTES } from '@/websocket/constants';
import { getConnectionMetadata } from '@/websocket/event';
import { createRealtimeEventEnvelope, postToConnection } from '@/websocket/gateway';
import { graphQlErrorToResponse, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { touchConnection } from '@/websocket/routes/touch';
import { HttpStatusCode } from '@/constants';
import { readAuthorizedWebSocketConnection } from '@/websocket/access';

export const handlePing = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const { connectionId, domainName, stage } = getConnectionMetadata(event);
  try {
    const connection = await readAuthorizedWebSocketConnection(connectionId);
    await assertWebSocketRateLimit(WEBSOCKET_ROUTES.PING, { connectionId, userId: connection.userId });
  } catch (error) {
    if (error instanceof GraphQLError) {
      return graphQlErrorToResponse(error);
    }
    throw error;
  }
  await touchConnection(event);

  await postToConnection(
    { connectionId, domainName, stage },
    createRealtimeEventEnvelope(WEBSOCKET_EVENT_TYPES.PING_PONG, { message: 'pong' }),
  );

  return response(HttpStatusCode.OK, { message: 'pong' });
};
