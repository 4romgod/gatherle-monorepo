const sendMock = jest.fn();
const clientConstructorMock = jest.fn();
const postToLocalConnectionMock = jest.fn();

jest.mock('@aws-sdk/client-apigatewaymanagementapi', () => {
  class MockPostToConnectionCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  const ApiGatewayManagementApiClient = jest.fn().mockImplementation((config) => {
    clientConstructorMock(config);
    return {
      send: sendMock,
    };
  });

  return {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand: MockPostToConnectionCommand,
  };
});

jest.mock('@/websocket/localGateway', () => ({
  LOCAL_WEBSOCKET_DOMAIN_NAME: 'local-websocket',
  postToLocalConnection: (...args: unknown[]) => postToLocalConnectionMock(...args),
}));

describe('websocket gateway', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    sendMock.mockResolvedValue(undefined);
    postToLocalConnectionMock.mockResolvedValue(undefined);
  });

  it('builds the management endpoint from a plain execute-api domain', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-1',
        domainName: 'abc.execute-api.af-south-1.amazonaws.com',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(clientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://abc.execute-api.af-south-1.amazonaws.com/beta',
      }),
    );
  });

  it('does not duplicate the stage when the stored domain already includes it', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-2',
        domainName: 'https://abc.execute-api.af-south-1.amazonaws.com/beta',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(clientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://abc.execute-api.af-south-1.amazonaws.com/beta',
      }),
    );
  });

  it('does not append the stage for a websocket custom domain', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-custom-domain',
        domainName: 'ws.beta.af-south-1.gatherle.com',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(clientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://ws.beta.af-south-1.gatherle.com',
      }),
    );
  });

  it('preserves an existing custom-domain base path without appending the stage', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-custom-domain-path',
        domainName: 'https://ws.example.com/realtime',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(clientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://ws.example.com/realtime',
      }),
    );
  });

  it('does not treat custom domains containing .execute-api. as default AWS hosts', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-lookalike-domain',
        domainName: 'https://ws.execute-api.af-south-1.gatherle.com/realtime',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(clientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://ws.execute-api.af-south-1.gatherle.com/realtime',
      }),
    );
  });

  it('routes local websocket delivery through the local gateway helper', async () => {
    const { postToConnection } = await import('@/websocket/gateway');

    await postToConnection(
      {
        connectionId: 'conn-local',
        domainName: 'local-websocket',
        stage: 'beta',
      },
      { type: 'ping', payload: { ok: true }, sentAt: '2026-06-01T00:00:00.000Z' },
    );

    expect(postToLocalConnectionMock).toHaveBeenCalledWith('conn-local', {
      type: 'ping',
      payload: { ok: true },
      sentAt: '2026-06-01T00:00:00.000Z',
    });
    expect(clientConstructorMock).not.toHaveBeenCalled();
  });
});
