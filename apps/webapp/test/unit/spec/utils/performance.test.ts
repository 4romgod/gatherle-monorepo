import { measureAsync, measureParallel } from '@/lib/utils/performance';

describe('performance utilities', () => {
  let nowSpy: jest.SpyInstance<number, []>;
  let timeSpy: jest.SpyInstance;
  let timeEndSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let time = 0;

  beforeEach(() => {
    time = 0;
    nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => {
      time += 10;
      return time;
    });
    timeSpy = jest.spyOn(console, 'time').mockImplementation(() => {});
    timeEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('measures async function execution', async () => {
    const fn = jest.fn().mockResolvedValue('result');

    const result = await measureAsync('async-op', fn);

    expect(fn).toHaveBeenCalled();
    expect(result).toBe('result');
    expect(timeSpy).toHaveBeenCalled();
    expect(timeEndSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles parallel operations and logs per operation', async () => {
    const operationOne = jest.fn().mockResolvedValue('one');
    const operationTwo = jest.fn().mockResolvedValue('two');

    const results = await measureParallel([
      { name: 'one', fn: operationOne },
      { name: 'two', fn: operationTwo },
    ]);

    expect(results).toEqual(['one', 'two']);
    expect(operationOne).toHaveBeenCalled();
    expect(operationTwo).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it('propagates errors from async operations', async () => {
    const error = new Error('failed');

    await expect(
      measureAsync('async-op-fail', () => {
        throw error;
      }),
    ).rejects.toThrow('failed');
    expect(errorSpy).toHaveBeenCalled();
  });
});
