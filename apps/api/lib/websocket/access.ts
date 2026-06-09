import { GraphQLError } from 'graphql';
import { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';
import { MobileDeviceAccessDAO, UserDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import type { WebSocketConnectionRecord } from '@/mongodb/dao/websocketConnection';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import { logger } from '@/utils/logger';
import { ERROR_MESSAGES as COMMON_ERROR_MESSAGES } from '@gatherle/commons/server/constants';

const CONNECTION_NOT_REGISTERED_MESSAGE = 'Connection is not registered. Reconnect and try again.';
const PRUNABLE_ACCESS_ERROR_CODES = new Set(['APP_ACCESS_BLOCKED', 'DEVICE_ACCESS_DENIED', 'UNAUTHENTICATED']);

const buildUnregisteredConnectionError = (): GraphQLError =>
  CustomError(CONNECTION_NOT_REGISTERED_MESSAGE, ErrorTypes.UNAUTHENTICATED);

const buildMissingUserError = (): GraphQLError =>
  CustomError(COMMON_ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);

const removeConnectionSafely = async (connectionId: string, reason: string) => {
  try {
    await WebSocketConnectionDAO.removeConnection(connectionId);
  } catch (error) {
    logger.warn('Failed to remove websocket connection after access denial', {
      connectionId,
      reason,
      error,
    });
  }
};

const assertUserAccessAllowed = async (userId: string) => {
  try {
    const user = await UserDAO.readUserById(userId);
    if (user.appAccessBlocked) {
      throw CustomError(COMMON_ERROR_MESSAGES.APP_ACCESS_BLOCKED, ErrorTypes.APP_ACCESS_BLOCKED);
    }

    return user;
  } catch (error) {
    if (error instanceof GraphQLError && error.extensions?.code === 'NOT_FOUND') {
      throw buildMissingUserError();
    }

    throw error;
  }
};

const assertMobileInstallationAccessAllowed = async (deviceInstallationId?: string) => {
  const normalizedDeviceInstallationId = deviceInstallationId?.trim();
  if (!normalizedDeviceInstallationId) {
    return;
  }

  const deviceAccess = await MobileDeviceAccessDAO.readByDeviceInstallationId(normalizedDeviceInstallationId);
  const status = deviceAccess?.status;
  if (status !== MobileDeviceAccessStatus.Blocked) {
    return;
  }

  throw CustomError(COMMON_ERROR_MESSAGES.MOBILE_DEVICE_ACCESS_BLOCKED, ErrorTypes.DEVICE_ACCESS_DENIED, {
    mobileDeviceAccessStatus: status,
  });
};

export const assertWebSocketAccessAllowed = async (input: { deviceInstallationId?: string; userId: string }) => {
  await assertUserAccessAllowed(input.userId);
  await assertMobileInstallationAccessAllowed(input.deviceInstallationId);
};

export const readAuthorizedWebSocketConnection = async (connectionId: string): Promise<WebSocketConnectionRecord> => {
  const connection = await WebSocketConnectionDAO.readConnectionByConnectionId(connectionId);
  if (!connection) {
    throw buildUnregisteredConnectionError();
  }

  try {
    await assertWebSocketAccessAllowed(connection);
    return connection;
  } catch (error) {
    if (error instanceof GraphQLError && PRUNABLE_ACCESS_ERROR_CODES.has(String(error.extensions?.code))) {
      await removeConnectionSafely(connectionId, 'route_access_denied');
    }
    throw error;
  }
};

export const assertAuthorizedWebSocketConnectionRecord = async (connection: WebSocketConnectionRecord) => {
  try {
    await assertWebSocketAccessAllowed(connection);
  } catch (error) {
    if (error instanceof GraphQLError && PRUNABLE_ACCESS_ERROR_CODES.has(String(error.extensions?.code))) {
      await removeConnectionSafely(connection.connectionId, 'publisher_access_denied');
    }
    throw error;
  }
};
