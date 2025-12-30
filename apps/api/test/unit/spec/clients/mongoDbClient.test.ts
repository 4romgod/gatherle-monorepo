const connectMock = jest.fn();
const disconnectMock = jest.fn();

const mockMongoose = () =>
  jest.doMock('mongoose', () => ({
    connect: connectMock,
    disconnect: disconnectMock,
  }));

describe('MongoDbClient', () => {
  beforeEach(() => {
    jest.resetModules();
    connectMock.mockReset();
    disconnectMock.mockReset();
  });

  it('connects only once when called multiple times', async () => {
    mockMongoose();
    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');

    await MongoDbClient.connectToDatabase('mongodb://example');
    await MongoDbClient.connectToDatabase('mongodb://example');

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith('mongodb://example');
  });

  it('throws when connection fails', async () => {
    const error = new Error('connection failed');
    connectMock.mockRejectedValue(error);
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');

    await expect(MongoDbClient.connectToDatabase('mongodb://example')).rejects.toThrow(error);
  });

  it('disconnects and resets state', async () => {
    mockMongoose();
    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');

    await MongoDbClient.connectToDatabase('mongodb://example');
    await MongoDbClient.disconnectFromDatabase();
    await MongoDbClient.connectToDatabase('mongodb://example');

    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it('throws when disconnect fails', async () => {
    const error = new Error('disconnect failed');
    disconnectMock.mockRejectedValue(error);
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');

    await expect(MongoDbClient.disconnectFromDatabase()).rejects.toThrow(error);
  });
});
