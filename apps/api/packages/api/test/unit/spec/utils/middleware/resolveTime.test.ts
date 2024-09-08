import {ResolverData} from 'type-graphql';
import {HTTP_METHOD_COLOR_MAP, RESOLVE_TIME_COLOR_MAP, GRAPHQL_API_PATH, ANSI_COLOR_CODES} from '@/constants';
import {getStatusCodeColor} from '@/utils';
import {ServerContext} from '@/graphql';
import {ResolveTime} from '@/utils/middleware';

jest.mock('@/constants', () => ({
  HTTP_METHOD_COLOR_MAP: {
    GET: '\x1b[32m',
    POST: '\x1b[33m',
  },
  RESOLVE_TIME_COLOR_MAP: [
    {threshold: 100, color: '\x1b[32m'},
    {threshold: 500, color: '\x1b[33m'},
  ],
  GRAPHQL_API_PATH: '/graphql',
  ANSI_COLOR_CODES: {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    GRAY: '\x1b[90m',
    BLUE: '\x1b[34m',
    WHITE: '\x1b[37m',
  },
}));

jest.mock('@/utils', () => ({
  getStatusCodeColor: jest.fn().mockReturnValue('\x1b[32m'),
}));

describe('ResolveTime Middleware', () => {
  let context: ServerContext;
  let info: any;
  let next: jest.Mock;

  beforeEach(() => {
    context = {
      req: {
        method: 'GET',
        baseUrl: '/api',
      },
      res: {
        statusCode: 200,
      },
    } as unknown as ServerContext;

    info = {
      parentType: {
        name: 'Query',
      },
      fieldName: 'testField',
    };

    next = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly measure resolve time and log with correct colors', async () => {
    const mockDateNow = jest.spyOn(Date, 'now').mockImplementationOnce(() => 1000); // Mock start time
    const resolveTimeMock = jest.spyOn(Date, 'now').mockImplementationOnce(() => 1100); // Mock end time (100ms elapsed)

    await ResolveTime({context, info} as ResolverData, next);

    expect(next).toHaveBeenCalled();

    const resolveTimeColor = RESOLVE_TIME_COLOR_MAP.find((color) => 100 <= color.threshold)?.color || ANSI_COLOR_CODES.RED;
    const httpMethodColor = HTTP_METHOD_COLOR_MAP[context.req?.method ?? 'UNKNOWN HTTP METHOD'] ?? ANSI_COLOR_CODES.GREEN;
    const statusCodeColor = getStatusCodeColor(context.res?.statusCode || 200);
    const baseUrl = context.req?.baseUrl ?? GRAPHQL_API_PATH;

    expect(console.log).toHaveBeenCalledWith(
      `${httpMethodColor}GET ${ANSI_COLOR_CODES.GRAY}/api ${ANSI_COLOR_CODES.BLUE}(Query.testField) ${statusCodeColor}200 - ${resolveTimeColor}[100 ms]${ANSI_COLOR_CODES.WHITE}`,
    );

    mockDateNow.mockRestore();
    resolveTimeMock.mockRestore();
  });

  it('should use default values for missing context properties', async () => {
    const mockDateNow = jest.spyOn(Date, 'now').mockImplementationOnce(() => 1000);
    const resolveTimeMock = jest.spyOn(Date, 'now').mockImplementationOnce(() => 1100);

    context = {} as ServerContext;
    await ResolveTime({context, info} as ResolverData, next);

    const baseUrl = GRAPHQL_API_PATH;
    const resolveTimeColor = ANSI_COLOR_CODES.GREEN;
    const httpMethodColor = ANSI_COLOR_CODES.GREEN;
    const statusCodeColor = getStatusCodeColor(200);

    expect(console.log).toHaveBeenCalledWith(
      `${httpMethodColor}UNKNOWN HTTP METHOD ${ANSI_COLOR_CODES.GRAY}${baseUrl} ${ANSI_COLOR_CODES.BLUE}(Query.testField) ${statusCodeColor}200 - ${resolveTimeColor}[100 ms]${ANSI_COLOR_CODES.WHITE}`,
    );

    mockDateNow.mockRestore();
    resolveTimeMock.mockRestore();
  });
});
