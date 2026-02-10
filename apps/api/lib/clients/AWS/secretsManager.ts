import { AWS_REGION, JWT_SECRET, MONGO_DB_URL, STAGE, NTLANGO_SECRET_ARN, SECRET_KEYS } from '@/constants';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { APPLICATION_STAGES } from '@ntlango/commons';
import { logger } from '@/utils/logger';

let secretsManagerClient: SecretsManagerClient;

function getSecretsManagerClient(): SecretsManagerClient {
  if (!secretsManagerClient) {
    secretsManagerClient = new SecretsManagerClient({ region: AWS_REGION });
  }
  return secretsManagerClient;
}

let cachedSecrets: Record<string, string> = {};

async function getSecretValue(secretKey: string): Promise<string> {
  if (!NTLANGO_SECRET_ARN) {
    throw new Error('NTLANGO_SECRET_ARN is required when STAGE is not Dev');
  }

  if (cachedSecrets && cachedSecrets[secretKey]) {
    logger.debug('Secrets cache hit!');
    return cachedSecrets[secretKey];
  }

  const command = new GetSecretValueCommand({ SecretId: NTLANGO_SECRET_ARN });

  try {
    const data = await getSecretsManagerClient().send(command);
    cachedSecrets = (data.SecretString && JSON.parse(data.SecretString)) || {};
    const secretValue = cachedSecrets[secretKey];

    if (!secretValue) {
      throw new Error(`Secret "${secretKey}" not found in Secrets Manager`);
    }

    return secretValue;
  } catch (error) {
    logger.error('Error retrieving secret:', { error });
    throw error;
  }
}

export async function getConfigValue(key: string): Promise<string> {
  if (STAGE === APPLICATION_STAGES.DEV) {
    const secretConfig = {
      [SECRET_KEYS.JWT_SECRET]: JWT_SECRET,
      [SECRET_KEYS.MONGO_DB_URL]: MONGO_DB_URL,
    };

    const value = secretConfig[key];
    if (!value) {
      throw new Error(`Missing configuration for key "${key}" in local environment`);
    }

    return value;
  }

  return getSecretValue(key);
}
