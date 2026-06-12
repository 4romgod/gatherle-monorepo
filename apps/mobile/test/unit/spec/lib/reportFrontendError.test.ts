import { reportFrontendError } from '@/lib/errors/reportFrontendError';

describe('reportFrontendError', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs frontend failures to console.error by default', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    reportFrontendError('Default failure', new Error('boom'));

    expect(errorSpy).toHaveBeenCalledWith(
      '[MobileFrontendError]',
      expect.objectContaining({
        context: 'Default failure',
        error: expect.objectContaining({
          message: 'boom',
          name: 'Error',
        }),
      }),
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs downgraded frontend failures to console.info', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    reportFrontendError('Expected session expiry', undefined, { operationName: 'GetRsvps' }, { level: 'info' });

    expect(infoSpy).toHaveBeenCalledWith(
      '[MobileFrontendInfo]',
      expect.objectContaining({
        context: 'Expected session expiry',
        error: undefined,
        metadata: {
          operationName: 'GetRsvps',
        },
      }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
