type ChainMethod = 'and' | 'lean' | 'limit' | 'sort' | 'populate' | 'select' | 'skip';

export interface MockQueryOptions {
  chainMethods?: ChainMethod[];
}

export const createMockSuccessMongooseQuery = <T>(
  result: T,
  options: MockQueryOptions = {},
): Record<string, jest.Mock> => {
  const chainMocks = Object.fromEntries((options.chainMethods ?? []).map((m) => [m, jest.fn().mockReturnThis()]));
  return {
    ...chainMocks,
    exec: jest.fn().mockResolvedValue(result),
  };
};

export const createMockFailedMongooseQuery = <T>(
  error: T,
  options: MockQueryOptions = {},
): Record<string, jest.Mock> => {
  const chainMocks = Object.fromEntries((options.chainMethods ?? []).map((m) => [m, jest.fn().mockReturnThis()]));
  return {
    ...chainMocks,
    exec: jest.fn().mockRejectedValue(error),
  };
};
