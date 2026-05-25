import { getConfigValue, MongoDbClient } from '@/clients';
import { SECRET_KEYS, validateEnv } from '@/constants';

export async function runSeedTask(task: () => Promise<void>) {
  validateEnv();

  const mongoDbUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(mongoDbUrl);

  try {
    await task();
  } finally {
    await MongoDbClient.disconnectFromDatabase();
  }
}
