import { WebSocketConnection as WebSocketConnectionModel } from '@/mongodb/models';
import { KnownCommonError , logDaoError } from '@/utils';

export interface UpsertWebSocketConnectionInput {
  connectionId: string;
  userId: string;
  domainName: string;
  stage: string;
  ttlHours?: number;
}

type WebSocketConnectionRecord = {
  connectionId: string;
  userId: string;
  domainName: string;
  stage: string;
  connectedAt: Date;
  lastSeenAt: Date;
  expiresAt?: Date;
};

class WebSocketConnectionDAO {
  private static buildExpiresAt(ttlHours?: number): Date | undefined {
    if (!ttlHours || ttlHours <= 0) {
      return undefined;
    }

    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  static async upsertConnection(input: UpsertWebSocketConnectionInput): Promise<WebSocketConnectionRecord> {
    try {
      const now = new Date();
      const expiresAt = this.buildExpiresAt(input.ttlHours);

      const connection = await WebSocketConnectionModel.findOneAndUpdate(
        { connectionId: input.connectionId },
        {
          $set: {
            userId: input.userId,
            domainName: input.domainName,
            stage: input.stage,
            lastSeenAt: now,
            expiresAt,
          },
          $setOnInsert: {
            connectedAt: now,
          },
        },
        { new: true, upsert: true },
      ).exec();

      if (!connection) {
        throw new Error(`Failed to upsert websocket connection ${input.connectionId}`);
      }

      return connection.toObject();
    } catch (error) {
      logDaoError('Error upserting websocket connection', { error, connectionId: input.connectionId });
      throw KnownCommonError(error);
    }
  }

  static async readConnectionByConnectionId(connectionId: string): Promise<WebSocketConnectionRecord | null> {
    try {
      const connection = await WebSocketConnectionModel.findOne({ connectionId }).exec();
      return connection ? connection.toObject() : null;
    } catch (error) {
      logDaoError('Error reading websocket connection by connection id', { error, connectionId });
      throw KnownCommonError(error);
    }
  }

  static async touchConnection(connectionId: string, ttlHours?: number): Promise<void> {
    try {
      const expiresAt = this.buildExpiresAt(ttlHours);
      await WebSocketConnectionModel.updateOne(
        { connectionId },
        {
          $set: {
            lastSeenAt: new Date(),
            expiresAt,
          },
        },
      ).exec();
    } catch (error) {
      logDaoError('Error touching websocket connection', { error, connectionId });
      throw KnownCommonError(error);
    }
  }

  static async removeConnection(connectionId: string): Promise<boolean> {
    try {
      const result = await WebSocketConnectionModel.deleteOne({ connectionId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      logDaoError('Error deleting websocket connection', { error, connectionId });
      throw KnownCommonError(error);
    }
  }

  static async readConnectionsByUserId(userId: string): Promise<WebSocketConnectionRecord[]> {
    try {
      const connections = await WebSocketConnectionModel.find({ userId }).exec();
      return connections.map((connection) => connection.toObject());
    } catch (error) {
      logDaoError('Error reading websocket connections for user', { error, userId });
      throw KnownCommonError(error);
    }
  }
}

export default WebSocketConnectionDAO;
