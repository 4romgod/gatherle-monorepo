import {APPLICATION_STAGES} from '@ntlango/commons';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({send: sendMock})),
  GetSecretValueCommand: jest.fn().mockImplementation((input) => ({input})),
}));

const mockConstants = (overrides: Partial<Record<string, string>> = {}) =>
  jest.doMock('@/constants', () => ({
    AWS_REGION: 'us-east-1',
    JWT_SECRET: 'local-jwt',
    MONGO_DB_URL: 'mongodb://local',
    STAGE: APPLICATION_STAGES.DEV,
    NTLANGO_SECRET_ARN: 'arn:aws:secretsmanager:region:123:secret:ntlango',
    SECRET_KEYS: {
      JWT_SECRET: 'JWT_SECRET',
      MONGO_DB_URL: 'MONGO_DB_URL',
    },
    ...overrides,
  }));

describe('getConfigValue', () => {
  beforeEach(() => {
    jest.resetModules();
    sendMock.mockReset();
  });

  it('returns local config when running in Dev', async () => {
    mockConstants();
    const {getConfigValue} = await import('@/clients/AWS/secretsManager');

    await expect(getConfigValue('JWT_SECRET')).resolves.toBe('local-jwt');
  });

  it('throws when local config is missing', async () => {
    mockConstants({JWT_SECRET: undefined as unknown as string});
    const {getConfigValue} = await import('@/clients/AWS/secretsManager');

    await expect(getConfigValue('JWT_SECRET')).rejects.toThrow('Missing configuration for key "JWT_SECRET"');
  });

  it('fetches secrets from AWS and caches results outside Dev', async () => {
    mockConstants({STAGE: APPLICATION_STAGES.PROD});
    sendMock.mockResolvedValue({SecretString: JSON.stringify({JWT_SECRET: 'remote-jwt'})});

    const {getConfigValue} = await import('@/clients/AWS/secretsManager');

    await expect(getConfigValue('JWT_SECRET')).resolves.toBe('remote-jwt');
    await expect(getConfigValue('JWT_SECRET')).resolves.toBe('remote-jwt');

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('throws when secret is missing in AWS response', async () => {
    mockConstants({STAGE: APPLICATION_STAGES.PROD});
    sendMock.mockResolvedValue({SecretString: JSON.stringify({MONGO_DB_URL: 'mongodb://remote'})});

    const {getConfigValue} = await import('@/clients/AWS/secretsManager');

    await expect(getConfigValue('JWT_SECRET')).rejects.toThrow('Secret "JWT_SECRET" not found in Secrets Manager');
  });
});
