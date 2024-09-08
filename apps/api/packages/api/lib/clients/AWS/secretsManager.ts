import {AWS_REGION, JWT_SECRET, MONGO_DB_URL, STAGE, NTLANGO_SECRET_ARN, SECRET_KEYS} from '@/constants';
import {SecretsManagerClient, GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import {APPLICATION_STAGES} from '@ntlango/commons';

const client = new SecretsManagerClient({region: AWS_REGION});

let cachedSecrets: {[key: string]: string} = {};

export async function getSecretValue(secretKey: string): Promise<string> {
  console.log('Retrieving secret from AWS secret manager...');

  if (cachedSecrets && cachedSecrets[secretKey]) {
    console.log('Secrets cache hit!');
    return cachedSecrets[secretKey];
  }

  console.log('Secrets cache miss!');
  const command = new GetSecretValueCommand({SecretId: NTLANGO_SECRET_ARN});

  try {
    const data = await client.send(command);
    cachedSecrets = (data.SecretString && JSON.parse(data.SecretString)) || {};
    return cachedSecrets[secretKey];
  } catch (err) {
    console.error('Error retrieving secret:', err);
    throw err;
  }
}

export async function getConfigValue(key: string): Promise<string> {
  if (STAGE == APPLICATION_STAGES.DEV) {
    const secretConfig = {
      [SECRET_KEYS.JWT_SECRET]: JWT_SECRET,
      [SECRET_KEYS.MONGO_DB_URL]: MONGO_DB_URL,
    };
    return secretConfig[key];
  } else {
    return await getSecretValue(key);
  }
}
