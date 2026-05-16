import type { ServerContext } from '@/graphql/apollo/server';
import { getRequestIpFromContext } from '@/utils/requestMetadata';

const createContext = (overrides: Partial<ServerContext> = {}): ServerContext =>
  ({
    loaders: {} as ServerContext['loaders'],
    ...overrides,
  }) as ServerContext;

describe('getRequestIpFromContext', () => {
  it('uses the first forwarded IP from the request headers', () => {
    const context = createContext({
      req: {
        headers: {
          'x-forwarded-for': ' 203.0.113.10, 198.51.100.5 ',
        },
      } as any,
    });

    expect(getRequestIpFromContext(context)).toBe('203.0.113.10');
  });

  it('supports forwarded-for headers provided as arrays', () => {
    const context = createContext({
      req: {
        headers: {
          'x-forwarded-for': ['198.51.100.20, 198.51.100.21'],
        },
      } as any,
    });

    expect(getRequestIpFromContext(context)).toBe('198.51.100.20');
  });

  it('reads the forwarded IP from lambda headers when no express request is present', () => {
    const context = createContext({
      lambdaEvent: {
        headers: {
          'X-Forwarded-For': '192.0.2.10, 192.0.2.11',
        },
      } as any,
    });

    expect(getRequestIpFromContext(context)).toBe('192.0.2.10');
  });

  it('falls back to req.ip and socket remoteAddress when forwarded headers are absent', () => {
    const reqIpContext = createContext({
      req: {
        headers: {},
        ip: '10.0.0.5',
      } as any,
    });

    expect(getRequestIpFromContext(reqIpContext)).toBe('10.0.0.5');

    const socketContext = createContext({
      req: {
        headers: {},
        socket: {
          remoteAddress: '10.0.0.6',
        },
      } as any,
    });

    expect(getRequestIpFromContext(socketContext)).toBe('10.0.0.6');
  });

  it('falls back to the lambda source IP when no request metadata is available', () => {
    const context = createContext({
      lambdaEvent: {
        headers: {},
        requestContext: {
          identity: {
            sourceIp: '172.16.0.10',
          },
        },
      } as any,
    });

    expect(getRequestIpFromContext(context)).toBe('172.16.0.10');
  });
});
