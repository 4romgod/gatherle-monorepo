import {connect, disconnect} from 'mongoose';
import {logger} from '@/utils/logger';

let mongodbConnected = false;

class MongoDbClient {
  static async connectToDatabase(databaseUrl: string) {
    try {
      if (!mongodbConnected) {
        logger.info('Connecting to MongoDB...');
        await connect(databaseUrl);
        mongodbConnected = true;
        logger.info('MongoDB connected successfully');
      } else {
        logger.debug('MongoDB already connected, skipping connection attempt');
      }
    } catch (error) {
      logger.error('Failed to connect to MongoDB!', error);
      throw error;
    }
  }

  static async disconnectFromDatabase() {
    try {
      await disconnect();
      mongodbConnected = false;
      logger.info('MongoDB disconnected!');
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB!', error);
      throw error;
    }
  }
}

export default MongoDbClient;
