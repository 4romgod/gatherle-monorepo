import {AWS_REGION, NTLANGO_SECRET_ARN} from '@/constants';
import {SecretsManagerClient, GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({region: AWS_REGION});

let cachedSecrets: {[key: string]: string} = {};

export async function getSecret(secretKey: string): Promise<string> {
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
