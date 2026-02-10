import mongoose, { connect, disconnect, type Query } from 'mongoose';
import { logger } from '@/utils/logger';

let mongodbConnected = false;

interface QueryContext {
  op?: string;
  _mongooseOptions?: { op?: string };
  model?: { modelName?: string };
}

/**
 * Extracts query metadata for logging purposes.
 * Handles various mongoose query structures gracefully.
 */
function getQueryMetadata(queryContext: QueryContext): { operation: string; modelName: string } {
  const operation = queryContext.op || queryContext._mongooseOptions?.op || 'query';
  const modelName = queryContext.model?.modelName || 'unknown';
  return { operation, modelName };
}

type QueryExecFunction = Query<unknown, unknown>['exec'];

/**
 * Creates a timing wrapper for mongoose Query.exec.
 * Logs execution time at debug level for performance monitoring.
 */
function createTimingWrapper(originalExec: QueryExecFunction) {
  return async function execWithTiming(this: QueryContext, ...args: Parameters<QueryExecFunction>) {
    const start = Date.now();

    try {
      const result = await originalExec.apply(this, args);
      const elapsed = Date.now() - start;

      try {
        const { operation, modelName } = getQueryMetadata(this);
        logger.debug(`MongoDB ${modelName}.${operation} - ${elapsed}ms`);
      } catch {
        // If metadata extraction fails, log basic timing
        logger.debug(`MongoDB query - ${elapsed}ms`);
      }

      return result;
    } catch (error) {
      const elapsed = Date.now() - start;
      logger.warn(`MongoDB query failed after ${elapsed}ms`, { error });
      throw error;
    }
  };
}

/**
 * Patches mongoose Query.prototype.exec to add timing instrumentation.
 * Safe to call multiple times - will only patch once.
 */
function patchMongooseQueryTiming(): void {
  try {
    const QueryProto = mongoose.Query?.prototype as
      | (typeof Query.prototype & { __timingPatched?: boolean })
      | undefined;

    if (!QueryProto) {
      logger.warn('mongoose.Query.prototype not available, skipping timing instrumentation');
      return;
    }

    if (QueryProto.__timingPatched) {
      return; // Already patched
    }

    const originalExec = QueryProto.exec;
    QueryProto.exec = createTimingWrapper(originalExec);
    QueryProto.__timingPatched = true;

    logger.debug('Mongoose query timing instrumentation enabled');
  } catch (error) {
    logger.warn('Failed to patch mongoose Query.exec for timing', { error });
  }
}

class MongoDbClient {
  static async connectToDatabase(databaseUrl: string) {
    try {
      if (!mongodbConnected) {
        logger.info('Connecting to MongoDB...');
        await connect(databaseUrl);

        // Add query timing instrumentation for performance monitoring
        patchMongooseQueryTiming();

        mongodbConnected = true;
        logger.info('MongoDB connected successfully');
      } else {
        logger.debug('MongoDB already connected, skipping connection attempt');
      }
    } catch (error) {
      logger.error('Failed to connect to MongoDB!', { error });
      throw error;
    }
  }

  static async disconnectFromDatabase() {
    try {
      await disconnect();
      mongodbConnected = false;
      logger.info('MongoDB disconnected!');
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB!', { error });
      throw error;
    }
  }
}

export default MongoDbClient;
