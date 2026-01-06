const connectMock = jest.fn();
const disconnectMock = jest.fn();
const mockQuery: any = {
  prototype: {},
};

const mockMongoose = () =>
  jest.doMock('mongoose', () => ({
    connect: connectMock,
    disconnect: disconnectMock,
    Query: mockQuery,
  }));

describe('MongoDbClient', () => {
  beforeEach(() => {
    jest.resetModules();
    connectMock.mockReset();
    disconnectMock.mockReset();
    mockQuery.prototype = {};
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

  it('instruments mongoose Query.exec for timing', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Verify exec was patched
    expect(mockQuery.prototype.exec).not.toBe(originalExec);
    expect((mockQuery.prototype as any).__timingPatched).toBe(true);
  });

  it('handles timing instrumentation when model name is available', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call the patched exec
    const context = {
      op: 'find',
      model: {modelName: 'User'},
    };
    await mockQuery.prototype.exec.call(context);

    expect(originalExec).toHaveBeenCalled();
  });

  it('handles timing instrumentation when model name is missing', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call the patched exec without model
    const context = {
      op: 'find',
    };
    await mockQuery.prototype.exec.call(context);

    expect(originalExec).toHaveBeenCalled();
  });

  it('handles timing instrumentation when op is in _mongooseOptions', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call with op in _mongooseOptions instead of top-level
    const context = {
      _mongooseOptions: {op: 'aggregate'},
      model: {modelName: 'Event'},
    };
    await mockQuery.prototype.exec.call(context);

    expect(originalExec).toHaveBeenCalled();
  });

  it('handles timing instrumentation when no op is provided', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call with neither op nor _mongooseOptions.op (should default to 'query')
    const context = {
      model: {modelName: 'Event'},
    };
    await mockQuery.prototype.exec.call(context);

    expect(originalExec).toHaveBeenCalled();
  });

  it('handles timing instrumentation when model exists but modelName is missing', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call with model object but no modelName (should default to 'unknown')
    const context = {
      op: 'find',
      model: {},
    };
    await mockQuery.prototype.exec.call(context);

    expect(originalExec).toHaveBeenCalled();
  });

  it('handles timing instrumentation when query fails', async () => {
    const error = new Error('Query failed');
    const originalExec = jest.fn().mockRejectedValue(error);
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call the patched exec
    const context = {
      op: 'find',
      model: {modelName: 'User'},
    };
    await expect(mockQuery.prototype.exec.call(context)).rejects.toThrow(error);
  });

  it('handles timing instrumentation logging errors gracefully', async () => {
    const originalExec = jest.fn().mockResolvedValue({data: 'test'});
    mockQuery.prototype.exec = originalExec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Call with context that throws when accessing properties
    const context = {
      get op() {
        throw new Error('Cannot read op');
      },
      model: {modelName: 'User'},
    };
    
    // Should not throw, just log fallback message
    await mockQuery.prototype.exec.call(context);
    expect(originalExec).toHaveBeenCalled();
  });

  it('skips patching if already patched', async () => {
    mockQuery.prototype.exec = jest.fn();
    (mockQuery.prototype as any).__timingPatched = true;
    const execBefore = mockQuery.prototype.exec;
    mockMongoose();

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    await MongoDbClient.connectToDatabase('mongodb://example');

    // Should keep the same exec reference
    expect(mockQuery.prototype.exec).toBe(execBefore);
  });

  it('handles patching errors gracefully', async () => {
    // Mock mongoose without Query
    jest.doMock('mongoose', () => ({
      connect: connectMock,
      disconnect: disconnectMock,
      Query: null,
    }));

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    
    // Should not throw, just log warning
    await expect(MongoDbClient.connectToDatabase('mongodb://example')).resolves.not.toThrow();
  });

  it('handles patching when Query prototype throws on access', async () => {
    // Create a Query object that throws when accessing prototype
    const throwingQuery = {
      get prototype() {
        throw new Error('Cannot access prototype');
      },
    };

    jest.doMock('mongoose', () => ({
      connect: connectMock,
      disconnect: disconnectMock,
      Query: throwingQuery,
    }));

    const {default: MongoDbClient} = await import('@/clients/mongoDbClient');
    
    // Should not throw, just log warning and continue
    await expect(MongoDbClient.connectToDatabase('mongodb://example')).resolves.not.toThrow();
    expect(connectMock).toHaveBeenCalled();
  });
});
